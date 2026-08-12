import { StrictMode } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import OdontogramShell, { createDentalDeOdontogramSession } from "../App";
import { buildDentalDeBundle } from "../fhir/toFhirDentalDe";
import { __resetChartStateForTest, getReadOnly } from "../odontogram";

function bundle(patient: string, tooth: string) {
  return buildDentalDeBundle({
    version: "2.25",
    globals: {},
    teeth: { [tooth]: { toothSelection: "none" } },
  }, { subject: patient, effectiveDateTime: "2026-08-12" }).bundle;
}

beforeEach(() => {
  __resetChartStateForTest();
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
      }),
    });
  }
  if (!("ResizeObserver" in window)) {
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      value: class { observe() {} unobserve() {} disconnect() {} },
    });
  }
});

afterEach(async () => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  cleanup();
});

describe("odontogram-229 AC1/AC6: canonical shell lifecycle", () => {
  it("hydrates the real shell under StrictMode and enforces session read-only", async () => {
    const imported = createDentalDeOdontogramSession(bundle("Patient/a", "11"));
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const { container } = render(
      <StrictMode><OdontogramShell session={imported.session} /></StrictMode>,
    );

    await waitFor(() => expect(container.querySelectorAll("#toothGrid .tooth-tile").length).toBeGreaterThan(0));
    expect(getReadOnly()).toBe(true);
    expect(imported.session.getDocument().teeth["11"].toothSelection).toBe("none");
  });

  it("switches patients by replacing sessions without reusing clinical state", async () => {
    const patientA = createDentalDeOdontogramSession(bundle("Patient/a", "11"));
    const patientB = createDentalDeOdontogramSession(bundle("Patient/b", "46"));
    expect(patientA.ok && patientB.ok).toBe(true);
    if (!patientA.ok || !patientB.ok) return;

    const { rerender } = render(<OdontogramShell session={patientA.session} />);
    rerender(<OdontogramShell session={patientB.session} />);

    await waitFor(() => expect(patientB.session.isActive()).toBe(true));
    expect(patientB.session.patient.reference).toBe("Patient/b");
    expect(patientB.session.getDocument().teeth["46"].toothSelection).toBe("none");
    expect(patientB.session.getDocument().teeth["11"]?.toothSelection ?? "tooth-base").not.toBe("none");
    expect(patientA.session.getDocument().teeth["11"].toothSelection).toBe("none");
  });
});
