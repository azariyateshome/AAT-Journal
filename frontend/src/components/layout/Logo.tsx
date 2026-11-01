import React from "react";
import logoLight from "../../assets/logo/logo-light.png";
import logoDark from "../../assets/logo/logo-dark.png";

type Props = { className?: string };

/** AAT logo. Light theme shows the original artwork, dark theme the recoloured one. */
const Logo: React.FC<Props> = ({ className = "" }) => (
  <span className={`aat-logo ${className}`} role="img" aria-label="AAT logo">
    <img className="aat-logo-light" src={logoLight} alt="" draggable={false} />
    <img className="aat-logo-dark" src={logoDark} alt="" draggable={false} />
  </span>
);

export default Logo;
