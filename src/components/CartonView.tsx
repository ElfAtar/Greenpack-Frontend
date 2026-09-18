import type { CartonDto } from '../types/visualization';

interface Props {
  carton: CartonDto;
}

export default function CartonView({ carton }: Props) {
  return (
    <div style={{ border: '1px solid #333', padding: '10px', marginBottom: '10px' }}>
      <h3>Carton</h3>
      <p>Carton Key: {carton.cartonKey}</p>
      <p>Width: {carton.width}</p>
      <p>Height: {carton.height}</p>
      <p>Thickness: {carton.thickness}</p>
      <p>Items per carton: {carton.boxesOrBundlesPerCarton}</p>
      <p>Bundle/Box X count: {carton.numBundleOrBoxX}</p>
      <p>Bundle/Box Y count: {carton.numBundleOrBoxY}</p>
      <p>Bundle/Box Z count: {carton.numBundleOrBoxZ}</p>
    </div>
  );
}
