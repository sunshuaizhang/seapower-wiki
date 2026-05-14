// Inline link inside weapon ammo cells. Clicking opens the singleton AmmoPopover.

import { useApp } from '../state/useApp';

export function AmmoLink({ id }: { id: string }) {
  const { ammoNames, openAmmoPopover } = useApp();
  const display = ammoNames[id] || id;
  return (
    <a
      className="ammo-link"
      data-ammo={id}
      onClick={(e) => {
        e.preventDefault();
        openAmmoPopover(e.currentTarget, id);
      }}
    >
      {display}
    </a>
  );
}
