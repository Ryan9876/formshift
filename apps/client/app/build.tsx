import { AccessGate } from '../src/screens/AccessGate';
import { BuildWorkspace } from '../src/screens/BuildWorkspace';

export default function BuildRoute() {
  return <AccessGate><BuildWorkspace /></AccessGate>;
}
