import arg from "arg";
import { Spec } from "arg";

export const args: Spec = {
  "--help": Boolean,
  "-h": "--help",
};

export default arg(args, {
  permissive: true,
});
