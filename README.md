# GreenHarmonization Frontend

A React-based 3D visualization application for packaging optimization and harmonization. This application provides interactive 3D visualizations for boxes, bundles, cartons, and pallets to help optimize packaging configurations and improve logistics efficiency.

## 🚀 Features

- **3D Visualization**: Interactive 3D rendering of packaging components using Three.js
  - Box visualization with dimensions
  - Bundle arrangements
  - Carton packing with flaps
  - Pallet stacking configurations
  
- **Product Management**: Manage products, product groups, and their packaging specifications

- **Scenario Management**: Create and compare different packaging scenarios

- **User Management**: Role-based access control and user administration

- **PDF Export**: Generate PDF reports of visualizations and configurations

- **Dynamic Backend Connection**: Automatically detects and connects to the backend API

## 📋 Prerequisites

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **Backend API**: The GreenHarmonization API must be running (see API_CONFIG.md)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GreenHarmonization.Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the backend URL** (Optional)
   
   Create a `.env` file in the root directory:
   ```env
   VITE_BACKEND_URL=https://localhost:5001
   ```
   
   If not configured, the app will auto-detect the backend on common ports (5001, 5000, etc.)

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173` (default Vite port)

## 📦 Build for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

## 🎯 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Sidebar, Layout)
│   ├── icons/          # Icon components
│   ├── BoxViewThreeJS.tsx        # 3D box visualization
│   ├── BundleViewThreeJS.tsx     # 3D bundle visualization
│   ├── CartonViewThreeJS.tsx     # 3D carton visualization
│   ├── PalletViewThreeJS.tsx     # 3D pallet visualization
│   └── ...             # Other components
├── pages/              # Page components
│   ├── Dashboard.tsx
│   ├── ProductList.tsx
│   ├── Visualization.tsx
│   └── ...
├── services/           # API service layer
│   └── scenarioService.ts
├── types/              # TypeScript type definitions
│   ├── api.ts
│   ├── index.ts
│   └── visualization.ts
├── utils/              # Utility functions
│   └── api.ts         # API helper functions
├── config/             # Configuration files
│   └── navigation.ts
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## 🎨 Key Technologies

- **React 19**: UI framework
- **TypeScript**: Type-safe development
- **React Router**: Client-side routing and navigation
- **Three.js**: 3D graphics rendering
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for react-three-fiber
- **Vite**: Fast build tool and dev server
- **html2canvas**: Canvas-based screenshot functionality
- **jsPDF**: PDF generation for reports

## 📱 Main Pages

### Dashboard
Central hub showing key metrics and quick access to main features.

### Product Management
- **Product List**: View and manage all products
- **Product Groups**: Organize products into groups
- **Box List**: Manage box specifications
- **Carton List**: Manage carton configurations

### Scenario Management
Create and compare different packaging scenarios to find optimal configurations.

### Visualization
Interactive 4-panel view showing:
1. **Box** (Kutu) - Individual box dimensions
2. **Bundle** - Multiple boxes grouped together
3. **Carton** (Koli) - Bundles packed in cartons with flaps
4. **Pallet** (Palet) - Cartons stacked on pallets

### User Management
Manage system users and their permissions (Admin only).

## 🔧 Configuration

### Backend API Configuration

The frontend automatically detects the backend API. For manual configuration, see [API_CONFIG.md](./API_CONFIG.md).

### Environment Variables

Create a `.env` file:

```env
# Backend API URL (optional - auto-detected if not set)
VITE_BACKEND_URL=https://localhost:5001

# Add other environment variables as needed
```

## 🎯 Usage

### Viewing a Visualization

1. Navigate to a product from the Product List
2. Select "Run" to create a scenario
3. Click "Visualization" to view the 3D breakdown
4. Use the download button to export as PDF

### Managing Products

1. Go to Product List
2. Click "Add Product" to create new entries
3. Edit existing products by clicking the edit icon
4. Configure box, bundle, carton, and pallet specifications

### Running Scenarios

1. Select a product
2. Click "Run" to generate optimization scenarios
3. Review different configurations
4. Compare results and select optimal solution

## 🐛 Troubleshooting

### Backend Connection Issues

If the frontend cannot connect to the backend:

1. Ensure the backend API is running
2. Check the console for error messages
3. Verify the backend URL in `.env` file
4. Try manually setting `VITE_BACKEND_URL`

### 3D Visualization Not Loading

1. Clear browser cache
2. Check browser console for WebGL errors
3. Ensure browser supports WebGL
4. Try a different browser (Chrome/Firefox recommended)

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## 📝 Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components and hooks
- Keep components small and focused
- Write self-documenting code with clear variable names

### Component Structure

```typescript
import React from 'react';
import type { PropsType } from '../types';

interface Props {
  // Define props
}

export default function ComponentName({ props }: Props) {
  // Component logic
  
  return (
    // JSX
  );
}
```

### API Calls

Use the `buildApiUrl()` helper from `src/utils/api.ts`:

```typescript
import { buildApiUrl } from '../utils/api';

const response = await fetch(buildApiUrl('/api/products'));
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[Add your license information here]

## 👥 Team

[Add team members and contact information here]

## 🔗 Related Documentation

- [API Configuration Guide](./API_CONFIG.md)
- [Backend API Documentation](../GreenHarmonization.API/)

## 📞 Support

For issues, questions, or contributions, please:
- Open an issue on GitHub
- Contact the development team
- Check existing documentation

---

**Note**: This is a frontend application that requires the GreenHarmonization backend API to function properly. Make sure the backend is running before starting the frontend.

