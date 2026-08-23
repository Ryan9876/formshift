import { AccessGate } from '../src/screens/AccessGate';
import { SpatialImportLabScreen } from '../src/screens/SpatialImportLabScreen';

export default function SpatialImportRoute() {
  return <AccessGate><SpatialImportLabScreen /></AccessGate>;
}
