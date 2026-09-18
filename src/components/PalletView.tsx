import type { PalletDto } from '../types/visualization';

export default function PalletView({ pallet }: { pallet: PalletDto }) {
  const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

  const utilization =
    typeof pallet.utilization === 'number'
      ? `${pallet.utilization.toFixed(2)}%`
      : 'N/A';

  const mappingKeys = pallet.cartonPalletMapping ? Object.keys(pallet.cartonPalletMapping) : [];
  const dimKeys = pallet.cartonDimensions ? Object.keys(pallet.cartonDimensions) : [];

  return (
    <div style={{ border: '1px solid #333', padding: 10, borderRadius: 8 }}>
      <h3>Pallet</h3>
      <p>Length: {num(pallet.length) ?? 'N/A'}</p>
      <p>Width: {num(pallet.width) ?? 'N/A'}</p>
      <p>Stack Height: {num(pallet.stackHeight) ?? 'N/A'}</p>
      <p>Total Cartons: {num(pallet.totalCartons) ?? 'N/A'}</p>
      <p>Utilization: {utilization}</p>
      <p>Carton Mapping Keys: {mappingKeys.length ? mappingKeys.join(', ') : 'None'}</p>
      <p>Carton Dimensions Keys: {dimKeys.length ? dimKeys.join(', ') : 'None'}</p>
    </div>
  );
}
