interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: SliderProps) {
  const id = "setting-" + label.toLowerCase().replaceAll(" ", "-");
  return (
    <label className="slider-row" htmlFor={id}>
      <span>{label}</span>
      <output htmlFor={id}>
        {Number(value.toFixed(3))}
        {unit}
      </output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
