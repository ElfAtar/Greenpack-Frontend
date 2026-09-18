import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const Callback: React.FC = () => {
    const location = useLocation();
    // Redirect to root, preserving the query string (e.g. ?code=...)
    return <Navigate to={'/' + location.search} replace />;
};

export default Callback;
