import type { FormTemplate } from '../../types';
import {
  DOCUMENT_REQUEST_FRAME,
  DOCUMENT_REQUEST_PAGE,
  documentRequestBodyLines,
  documentRequestDate,
  documentRequestParcelOptions,
} from '../../lib/documentRequestPrint';

interface DocumentRequestFormPreviewProps {
  template: FormTemplate;
  values: Record<string, string>;
}

export function DocumentRequestFormPreview({ template, values }: DocumentRequestFormPreviewProps) {
  const lines = documentRequestBodyLines(template, values);
  const parcelOptions = documentRequestParcelOptions(template, values);
  const dateField = template.fields.find((field) => field.key === 'request_date');

  return (
    <div className="form-font relative mx-auto aspect-[210/297] w-full max-w-[210mm] [container-type:inline-size] overflow-hidden bg-white text-black shadow-soft">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${DOCUMENT_REQUEST_PAGE.width} ${DOCUMENT_REQUEST_PAGE.height}`}
        aria-hidden="true"
      >
        <path
          d={`M 584 0 V ${DOCUMENT_REQUEST_PAGE.height}`}
          fill="none"
          stroke="#171717"
          strokeWidth="0.55"
        />
        <rect
          x={DOCUMENT_REQUEST_FRAME.inset}
          y={DOCUMENT_REQUEST_FRAME.inset}
          width={DOCUMENT_REQUEST_PAGE.width - DOCUMENT_REQUEST_FRAME.inset * 2}
          height={DOCUMENT_REQUEST_PAGE.height - DOCUMENT_REQUEST_FRAME.inset * 2}
          fill="none"
          stroke={DOCUMENT_REQUEST_FRAME.stroke}
          strokeWidth={DOCUMENT_REQUEST_FRAME.strokeWidth}
        />
        {parcelOptions.map((option) => {
          const boxY = DOCUMENT_REQUEST_PAGE.height - option.y - 7;
          return (
            <g key={option.label}>
              <rect
                x={option.x - 3}
                y={boxY}
                width="8"
                height="8"
                fill="white"
                stroke="#171717"
                strokeWidth="0.65"
              />
              {option.selected ? (
                <path
                  d={`M ${option.x - 1} ${boxY + 4} l 2 2 l 4 -5`}
                  fill="none"
                  stroke="#111"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div
        className="absolute z-10 whitespace-nowrap text-right text-[1.76cqw] leading-tight"
        style={{ left: '20.2%', top: '7.8%', width: '34%' }}
        dir="rtl"
      >
        {dateField?.label ?? 'تاریخ تقاضا'}: {documentRequestDate(template, values)}
      </div>
      {parcelOptions.map((option) => (
        <span
          key={option.label}
          className="absolute z-10 -translate-y-[70%] overflow-hidden bg-white text-right text-[1.76cqw] leading-tight"
          style={{
            left: `${((option.x + 11) / DOCUMENT_REQUEST_PAGE.width) * 100}%`,
            top: `${((DOCUMENT_REQUEST_PAGE.height - option.y) / DOCUMENT_REQUEST_PAGE.height) * 100}%`,
            maxWidth: `${(option.width / DOCUMENT_REQUEST_PAGE.width) * 100}%`,
          }}
          dir="rtl"
        >
          {option.label}
        </span>
      ))}
      <div
        className="absolute z-10 flex flex-col text-justify text-[1.76cqw] leading-[1.82]"
        style={{ inset: '5.6% 7% 5%' }}
        dir="rtl"
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className={`min-h-[1.82em] whitespace-pre-wrap${line.heading ? ' text-center font-bold' : ''}`}
          >
            {line.text || '\u00a0'}
          </div>
        ))}
      </div>
    </div>
  );
}
