import React from 'react';
import clsx from 'clsx';

export default function MSIcon({ name, fill = 0, className, style }) {
  return (
    <span
      className={clsx('material-symbols-outlined select-none', className)}
      style={{ fontVariationSettings: `'FILL' ${fill},'wght' 400,'GRAD' 0,'opsz' 24`, ...style }}
    >
      {name}
    </span>
  );
}
