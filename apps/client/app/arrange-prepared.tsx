import { AccessGate } from '../src/screens/AccessGate';
import { PhotoArrangeWorkspace } from '../src/screens/PhotoArrangeWorkspace';

export default function PreparedArrangeRoute() {
  return <AccessGate><PhotoArrangeWorkspace forcePreparedScene /></AccessGate>;
}
