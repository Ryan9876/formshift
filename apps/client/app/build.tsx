import { AccessGate } from '../src/screens/AccessGate';
import { PhotoBuildWorkspace } from '../src/screens/PhotoBuildWorkspace';

export default function BuildRoute() {
  return <AccessGate><PhotoBuildWorkspace /></AccessGate>;
}
