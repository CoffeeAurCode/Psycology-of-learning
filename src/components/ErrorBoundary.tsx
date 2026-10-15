import { Component, type ErrorInfo, type ReactNode } from "react";
import { CoffeeMug } from "./CoffeeMug";

/** Last line of defence: show a friendly screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[app] crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty" role="alert" style={{ minHeight: "70dvh", alignContent: "center" }}>
        <CoffeeMug size={96} steam={false} />
        <h2 className="display" style={{ margin: 0, color: "var(--ink)" }}>
          Oops, something spilled.
        </h2>
        <p style={{ margin: 0 }}>Your progress is saved. Reload to continue.</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
