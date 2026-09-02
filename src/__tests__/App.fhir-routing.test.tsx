import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import App from "../App";
import { PAYLOAD_VERSION } from "../document";
import { createOdontogramSession, getActiveOdontogramSession } from "../odontogram";
import { DENTAL_CORE } from "../fhir/dentalCoreContract";
import { setI18nLanguage } from "../i18n/useI18n";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  setI18nLanguage("en");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

describe("FHIR button routing", () => {
  it("uses Dental Core for the standalone session", async () => {
    getActiveOdontogramSession().setDocument({
      version: PAYLOAD_VERSION,
      globals: {},
      teeth: {},
      examination: { effectiveDateTime: "2026-08-14" },
    });
    render(<App />);

    await waitFor(() => expect(getActiveOdontogramSession().fhir).not.toHaveProperty("dialect"));
    const standaloneSession = getActiveOdontogramSession();
    const exportBundle = vi.spyOn(standaloneSession, "exportFhirBundle");
    fireEvent.click(document.getElementById("btnStatusFhirExport") as HTMLButtonElement);

    expect(exportBundle).toHaveBeenCalledOnce();
    expect(exportBundle.mock.results[0]?.value.identifier?.system).toBe(DENTAL_CORE);
  }, 15_000);

  it("uses the supplied Dental Core session codec", async () => {
    const session = createOdontogramSession({ version: "2.30", globals: {}, teeth: {} }, {
      fhir: { exportOptions: { subject: "Patient/mira", effectiveDateTime: "2026-08-14" } },
    });
    const exportBundle = vi.spyOn(session, "exportFhirBundle");
    render(<App session={session} />);

    await waitFor(() => expect(session.isActive()).toBe(true));
    fireEvent.click(document.getElementById("btnStatusFhirExport") as HTMLButtonElement);

    expect(exportBundle).toHaveBeenCalledOnce();
    expect(exportBundle.mock.results[0]?.value.identifier?.system).toBe(DENTAL_CORE);
  }, 15_000);

  it("uses the private component session configured through the FHIR prop", async () => {
    render(<App document={{ version: "2.30", globals: {}, teeth: {} }} fhir={{ exportOptions: { subject: "Patient/mira", effectiveDateTime: "2026-08-14" } }} />);

    await waitFor(() => expect(getActiveOdontogramSession().fhir).not.toHaveProperty("dialect"));
    const privateSession = getActiveOdontogramSession();
    const exportBundle = vi.spyOn(privateSession, "exportFhirBundle");
    fireEvent.click(document.getElementById("btnStatusFhirExport") as HTMLButtonElement);

    expect(exportBundle).toHaveBeenCalledOnce();
    expect(exportBundle.mock.results[0]?.value.identifier?.system).toBe(DENTAL_CORE);
  }, 15_000);

  it("shows the effective-date alert for a Dental Core session without export context", async () => {
    const alert = vi.spyOn(window, "alert");
    render(<App document={{ version: "2.30", globals: {}, teeth: { "16": { endoResection: true } } }} />);

    await waitFor(() => expect(getActiveOdontogramSession().fhir).not.toHaveProperty("dialect"));
    fireEvent.click(document.getElementById("btnStatusFhirExport") as HTMLButtonElement);

    expect(alert).toHaveBeenCalledWith("FHIR export requires an effective date in the examination context.");
  }, 15_000);

  it("shows the unsupported Dental Core field instead of an effective-date instruction", async () => {
    const alert = vi.spyOn(window, "alert");
    render(<App document={{
      version: PAYLOAD_VERSION,
      globals: {},
      teeth: { "46": { rootResection: "hemisection", rootResectionRoot: "mesial" } },
      examination: { effectiveDateTime: "2026-08-14" },
    }} />);

    await waitFor(() => expect(getActiveOdontogramSession().fhir).not.toHaveProperty("dialect"));
    fireEvent.click(document.getElementById("btnStatusFhirExport") as HTMLButtonElement);

    expect(alert).toHaveBeenCalledWith(
      "FHIR export cannot represent the current chart: Dental Core cannot faithfully represent populated field: teeth.46.rootResection",
    );
    expect(alert).not.toHaveBeenCalledWith("FHIR export requires an effective date in the examination context.");
  }, 15_000);
});
