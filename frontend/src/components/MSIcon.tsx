import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

interface MSIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  fill?: number;
}

export default function MSIcon({ name, fill = 0, className, style, ...props }: MSIconProps) {
  return (
    <span
      {...props}
      className={clsx('material-symbols-outlined select-none', className)}
      style={{ fontVariationSettings: `'FILL' ${fill},'wght' 400,'GRAD' 0,'opsz' 24`, ...style }}
    >
      {name}
    </span>
  );
}
