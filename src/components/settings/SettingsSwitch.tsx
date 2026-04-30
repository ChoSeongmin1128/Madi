interface SettingsSwitchProps {
  id: string;
  checked: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsSwitch({
  id,
  checked,
  label,
  description,
  disabled = false,
  onChange,
}: SettingsSwitchProps) {
  return (
    <label className="settings-switch-row" htmlFor={id}>
      <span className="settings-toggle-copy">
        <span className="settings-toggle-title">{label}</span>
        {description ? (
          <span className="document-menu-option-description">{description}</span>
        ) : null}
      </span>
      <input
        id={id}
        className="settings-switch-input"
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className="settings-switch-track" aria-hidden="true">
        <span className="settings-switch-thumb" />
      </span>
    </label>
  );
}
