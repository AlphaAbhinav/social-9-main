"use client";

import { Children, isValidElement, type OptionHTMLAttributes, type ReactElement, type ReactNode } from "react";
import * as Select from "@radix-ui/react-select";

type DropdownProps = {
  label: string;
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
  id?: string;
  disabled?: boolean;
  variant?: "default" | "brand";
  placeholder?: string;
};

function Chevron({ up = false }: { up?: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} /></svg>;
}

function initials(label: ReactNode) {
  return String(label).trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

/** Shared styled select. Option children keep dynamic lists easy to read at call sites. */
export function Dropdown({ label, value, onValueChange, children, id, disabled, variant = "default", placeholder = "Choose an option" }: DropdownProps) {
  const options = Children.toArray(children).filter((child): child is ReactElement<OptionHTMLAttributes<HTMLOptionElement>> => isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) && child.type === "option");
  const selected = options.find((option) => String(option.props.value) === String(value));

  return (
    <Select.Root value={String(value)} onValueChange={onValueChange} disabled={disabled || options.length === 0}>
      <Select.Trigger id={id} className={`ui-select-trigger ui-select-${variant}`} aria-label={label}>
        {variant === "brand" && <span className="ui-select-avatar" aria-hidden="true">{selected ? initials(selected.props.children) : "B"}</span>}
        <span className="ui-select-value"><Select.Value placeholder={placeholder}>{selected?.props.children}</Select.Value></span>
        <Select.Icon className="ui-select-chevron"><Chevron /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={`ui-select-menu ui-select-menu-${variant}`} position="popper" sideOffset={8} collisionPadding={12}>
          <Select.ScrollUpButton className="ui-select-scroll"><Chevron up /></Select.ScrollUpButton>
          <Select.Viewport className="ui-select-viewport">
            <Select.Group>
              <Select.Label className="ui-select-menu-label">{variant === "brand" ? "Switch brand" : label}</Select.Label>
              {options.map((option) => (
                <Select.Item className="ui-select-option" key={String(option.props.value)} value={String(option.props.value)} disabled={option.props.disabled}>
                  {variant === "brand" && <span className="ui-select-avatar" aria-hidden="true">{initials(option.props.children)}</span>}
                  <Select.ItemText>{option.props.children}</Select.ItemText>
                  <Select.ItemIndicator className="ui-select-check">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="ui-select-scroll"><Chevron /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
