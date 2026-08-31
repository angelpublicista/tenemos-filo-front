import Naranja from "../../public/filo-logo.png";
import Blanco from "../../public/filo-logo-blanco.png";

interface FiloLogoProps {
  className?: string;
}

/**
 * El logotipo de Tenemos Filo.
 *
 * Se pintan las dos versiones y el tema decide cual se ve: el naranja no
 * tiene contraste suficiente sobre fondo oscuro, y el blanco desaparece
 * sobre fondo claro. Resolverlo con CSS y no con JavaScript evita que el
 * logo parpadee al cargar, cuando todavia no se sabe que tema hay.
 */
export default function FiloLogo({ className }: FiloLogoProps) {
  const clases = `block ${className ?? ""}`;
  return (
    <>
      <img className={`${clases} dark:hidden`} src={Naranja.src} alt="Tenemos Filo" />
      <img className={`${clases} hidden dark:block`} src={Blanco.src} alt="Tenemos Filo" />
    </>
  );
}
