import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  accessToken: string | null;
  children: React.ReactNode;
}

export function ProtectedRoute({ accessToken, children }: ProtectedRouteProps) {
  if (!accessToken) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
} 