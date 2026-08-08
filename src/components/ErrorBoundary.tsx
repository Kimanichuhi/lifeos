import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { captureException } from '@/lib/monitoring';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Unhandled render error', error);
    captureException(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="card max-w-md w-full p-8 text-center">
            <div className="size-14 rounded-2xl bg-rose-500/10 text-rose-500 grid place-items-center mx-auto mb-4">
              <AlertTriangle size={26} />
            </div>
            <h1 className="font-display font-bold text-xl mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              An unexpected error occurred. Your data is untouched — reloading usually resolves this.
            </p>
            <button className="btn-primary mx-auto" onClick={() => window.location.reload()}>
              <RotateCcw size={15} /> Reload Life OS
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
