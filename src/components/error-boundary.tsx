"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <p className="text-sm text-[#0F1B3D]/60">
              Something went wrong loading this chat.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="rounded-full border border-[#0F1B3D]/10 bg-[#f5f7fb] px-5 py-2.5 text-sm font-semibold text-[#0F1B3D]/70 transition-all hover:bg-[#0F1B3D]/[0.08]"
            >
              Reload
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
