// Part of React Advanced Odontogram - https://github.com/ZoliQua/React-Odontogram-Modul
//
// Bead odontogram-c51.2: the cephalometric entry mask.
//
// Same shape as `ModelAnalysisCard`, and the same two decisions Dirk made for
// it: norms and deviations stay live while typing, so entering the values
// doubles as checking them. The profile selector chooses which school's
// selection and NORM SET the rows are read against — a measure with no norm in
// the active profile shows its value and no target rather than a made-up one.
//
// Self-contained: owns its React state and one `onStateChange` subscription.
// Nothing derived is stored; `assess()` runs on every render and is pure.

import { useEffect, useMemo, useRef, useState } from "react";
import { t, getI18nLanguage } from "./i18n/useI18n";
import {
  getCephProfileId, getCephValue, getCephValues, getReadOnly,
  onStateChange, setCephProfileId, setCephValue,
} from "./odontogram";
import {
  PROFILES, assess, normFor, profileMeasures,
  type CephAssessment, type CephMeasure, type GrowthIndicator,
} from "./cephalometry";
import { parseCephText, type ParsedValue } from "./cephImport";

function locale(): string {
  const lang = getI18nLanguage();
  return lang === "pt-br" ? "pt-BR" : lang;
}

function num(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return value.toLocaleString(locale(), {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

function signed(value: number | null): string {
  if (value === null) return "—";
  return value > 0 ? `+${num(value)}` : num(value);
}

const UNIT_LABEL: Record<CephMeasure["unit"], string> = { deg: "°", mm: "mm", percent: "%" };

/** Deviation in standard deviations, saturating at ±3. */
function SdBar({ deviations }: { deviations: number | null }) {
  if (deviations === null) return <span className="ceph-bar ceph-bar-empty" aria-hidden="true" />;
  const clamped = Math.max(-3, Math.min(3, deviations));
  const half = Math.abs(clamped) / 3 * 50;
  return (
    <span className="ceph-bar" aria-hidden="true">
      <span className="ceph-bar-axis" />
      <span
        className={`ceph-bar-fill ${clamped < 0 ? "is-under" : "is-over"}`}
        style={{ left: `${clamped < 0 ? 50 - half : 50}%`, width: `${half}%` }}
      />
    </span>
  );
}

function ValueInput({ measureId, value, readOnly }: {
  measureId: string; value: number | null; readOnly: boolean;
}) {
  // Text, not number: the decimal comma again, and a lone "-" has to survive
  // being half-typed. Same draft discipline as the model card.
  const [draft, setDraft] = useState(() => (value === null ? "" : num(value)));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value === null ? "" : num(value));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      className="ceph-input"
      value={draft}
      disabled={readOnly}
      data-measure={measureId}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setDraft(value === null ? "" : num(value)); }}
      onChange={e => {
        setDraft(e.currentTarget.value);
        const raw = e.currentTarget.value.trim().replace(",", ".");
        const n = raw === "" || raw === "-" || raw === "+" ? null : Number(raw);
        setCephValue(measureId, n === null || !Number.isFinite(n) ? null : n);
      }}
    />
  );
}

function MeasureRow({ measure, profileId, value, readOnly }: {
  measure: CephMeasure; profileId: string; value: number | null; readOnly: boolean;
}) {
  const { norm, sd } = normFor(measure.id, profileId)!;
  const deviation = value === null || norm === null ? null : value - norm;
  const deviations = deviation === null || sd === null || sd <= 0 ? null : deviation / sd;
  return (
    <tr data-row={measure.id}>
      <th scope="row">
        {t(measure.labelKey)}
        <small className="ceph-points"> {measure.points.join("·")}</small>
      </th>
      <td className="ceph-norm">
        {norm === null
          ? <span className="ceph-nonorm" title={t("ceph.noNorm")}>—</span>
          : <>{num(norm)}{sd === null ? "" : ` ± ${num(sd)}`}</>}
      </td>
      <td className="ceph-entry">
        <ValueInput measureId={measure.id} value={value} readOnly={readOnly} />
        <small>{UNIT_LABEL[measure.unit]}</small>
      </td>
      <td className={`ceph-delta${deviation === null ? "" : deviation > 0 ? " is-over" : " is-under"}`}>
        {signed(deviation)}
      </td>
      <td className="ceph-bar-cell"><SdBar deviations={deviations} /></td>
    </tr>
  );
}

function Findings({ a }: { a: CephAssessment }) {
  const jaw = (v: string | null) => (v === null ? "—" : t(`ceph.jaw.${v}`));
  return (
    <div className="ceph-findings">
      <section>
        <h4>{t("ceph.findings.jaws")}</h4>
        <dl>
          <dt>{t("ceph.maxilla")}</dt><dd>{jaw(a.jaws.maxilla)}</dd>
          <dt>{t("ceph.mandible")}</dt><dd>{jaw(a.jaws.mandible)}</dd>
          <dt>{t("ceph.harmony")}</dt>
          <dd>{a.jaws.harmonious === null ? "—" : t(a.jaws.harmonious ? "ceph.harmonious" : "ceph.disharmonious")}</dd>
          <dt>{t("ceph.sagittal.individual")}</dt>
          <dd>
            {a.jaws.sagittalClass === null ? "—" : t(`ceph.sagittal.${a.jaws.sagittalClass}`)}
            {a.jaws.individualisedAnb !== null && (
              <small> ({t("ceph.indAnb")} {num(a.jaws.individualisedAnb)}°, {signed(a.jaws.anbDeviation)})</small>
            )}
          </dd>
          <dt>{t("ceph.sagittal.population")}</dt>
          <dd className={a.jaws.sagittalClass !== a.jaws.sagittalClassPopulation ? "ceph-conflict" : ""}>
            {a.jaws.sagittalClassPopulation === null ? "—" : t(`ceph.sagittal.${a.jaws.sagittalClassPopulation}`)}
            {a.jaws.sagittalClass !== null
              && a.jaws.sagittalClass !== a.jaws.sagittalClassPopulation
              && <small> — {t("ceph.sagittal.differs")}</small>}
          </dd>
        </dl>
      </section>

      <section>
        <h4>{t("ceph.findings.growth")}</h4>
        <dl>
          <dt>{t("ceph.growthPattern")}</dt>
          <dd>
            {t(`ceph.growth.${a.growth.pattern}`)}
            {a.growth.dissent > 0 && (
              <small> — {t("ceph.growth.dissent", { n: a.growth.dissent })}</small>
            )}
          </dd>
          <dt>{t("ceph.verticalRelation")}</dt>
          <dd>
            {a.growth.verticalRelation === null ? "—" : t(`ceph.vertical.${a.growth.verticalRelation}`)}
            {a.growth.subdivision !== null && <small> {a.growth.subdivision}</small>}
          </dd>
        </dl>
        {a.growth.indicators.length > 0 && (
          <ul className="ceph-indicators">
            {a.growth.indicators.map((i: GrowthIndicator) => (
              <li key={i.id} className={`reads-${i.reads}`}>
                <span className="ceph-ind-id">{i.id}</span>
                <span className="ceph-ind-dev">{signed(i.deviations)} SD</span>
                <span className="ceph-ind-reads">{t(`ceph.growth.${i.reads}`)}</span>
                <span className="ceph-ind-basis">
                  {t(i.basis === "published-band" ? "ceph.basis.band" : "ceph.basis.sd")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** The paste-and-confirm importer. Nothing lands until the reader says so. */
function ImportPanel({ onClose, readOnly }: { onClose: () => void; readOnly: boolean }) {
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const parsed = useMemo(() => parseCephText(text), [text]);

  // Everything the parse was confident about starts selected; the rest starts
  // OFF, because a low-confidence row is usually a norm with no measurement.
  useEffect(() => {
    setChosen(Object.fromEntries(parsed.values.map(v => [v.measureId, v.confidence === "high"])));
  }, [parsed]);

  const apply = () => {
    for (const v of parsed.values) {
      if (chosen[v.measureId]) setCephValue(v.measureId, v.value);
    }
    onClose();
  };

  return (
    <div className="ceph-import" id="cephImport">
      <p className="ceph-import-hint">{t("ceph.import.hint")}</p>
      <textarea
        className="ceph-import-text"
        rows={5}
        value={text}
        onChange={e => setText(e.currentTarget.value)}
        placeholder={t("ceph.import.placeholder")}
        aria-label={t("ceph.import.hint")}
      />
      {parsed.values.length > 0 && (
        <>
          <ul className="ceph-import-list">
            {parsed.values.map((v: ParsedValue) => (
              <li key={v.measureId} className={`conf-${v.confidence}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!chosen[v.measureId]}
                    onChange={e => {
                      // Read `checked` HERE, not inside the updater: React has
                      // already nulled `currentTarget` by the time a functional
                      // setState callback runs, and the checkbox silently threw.
                      const next = e.currentTarget.checked;
                      setChosen(c => ({ ...c, [v.measureId]: next }));
                    }}
                  />
                  <span className="ceph-import-label">{v.label}</span>
                  <span className="ceph-import-value">{num(v.value)}</span>
                  {v.confidence === "low" && (
                    <span className="ceph-import-warn">{t("ceph.import.uncertain")}</span>
                  )}
                  <span className="ceph-import-cands">[{v.candidates.map(c => num(c)).join(" · ")}]</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="ceph-import-actions">
            <button type="button" onClick={apply} disabled={readOnly}>
              {t("ceph.import.apply", { n: Object.values(chosen).filter(Boolean).length })}
            </button>
            <button type="button" onClick={onClose}>{t("ceph.import.cancel")}</button>
          </div>
        </>
      )}
      {text.trim() !== "" && parsed.values.length === 0 && (
        <p className="ceph-import-empty">{t("ceph.import.nothing")}</p>
      )}
    </div>
  );
}

export function CephalometryCard() {
  const [values, setValues] = useState<Record<string, number>>(() => getCephValues());
  const [profileId, setProfile] = useState<string>(() => getCephProfileId());
  const [readOnly, setReadOnly] = useState<boolean>(() => getReadOnly());
  const [importing, setImporting] = useState(false);

  useEffect(() => onStateChange(() => {
    setValues(getCephValues());
    setProfile(getCephProfileId());
    setReadOnly(getReadOnly());
  }), []);

  const measures = useMemo(() => profileMeasures(profileId), [profileId]);
  const assessment = useMemo(() => assess(values, profileId), [values, profileId]);

  return (
    <section className="card ceph-card" id="cephalometryCard" aria-labelledby="cephTitle">
      <header className="ceph-head">
        <h3 id="cephTitle">{t("ceph.title")}</h3>
        <div className="ceph-head-controls">
          <label>
            {t("ceph.profile")}{" "}
            <select
              id="cephProfile"
              value={profileId}
              onChange={e => setCephProfileId(e.currentTarget.value)}
            >
              {PROFILES.map(p => (
                <option key={p.id} value={p.id}>{t(p.labelKey)}</option>
              ))}
            </select>
          </label>
          <button type="button" id="cephImportToggle" onClick={() => setImporting(v => !v)}>
            {t("ceph.import.open")}
          </button>
        </div>
      </header>

      {importing && <ImportPanel onClose={() => setImporting(false)} readOnly={readOnly} />}

      <p className="ceph-progress">
        {t("ceph.recorded", { n: assessment.recorded, total: assessment.total })}
      </p>

      <div className="ceph-scroll">
        <table className="ceph-table">
          <thead>
            <tr>
              <th scope="col">{t("ceph.measure")}</th>
              <th scope="col">{t("ceph.norm")}</th>
              <th scope="col">{t("ceph.value")}</th>
              <th scope="col">{t("ceph.deviation")}</th>
              <th scope="col"><span className="ceph-visually-hidden">{t("ceph.deviation")}</span></th>
            </tr>
          </thead>
          <tbody>
            {measures.map(m => (
              <MeasureRow
                key={m.id}
                measure={m}
                profileId={profileId}
                value={getCephValue(m.id) ?? (values[m.id] ?? null)}
                readOnly={readOnly}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Findings a={assessment} />
    </section>
  );
}

export default CephalometryCard;
