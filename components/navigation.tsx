import type {ComponentProps} from "react";

/** Full document navigation also works before hydration or when RSC routing fails. */
export default function Link({href,...props}:ComponentProps<"a"> & {href:string}) {
  return <a href={href} {...props}/>;
}
