import React, { Component } from "react";

class ManejoError extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ManejoError detectó un error", error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="page-state" role="alert">
          <h1>Algo salió mal</h1>
          <p>La vista no pudo cargarse correctamente.</p>
          <button type="button" onClick={this.retry}>Volver a intentarlo</button>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ManejoError;
