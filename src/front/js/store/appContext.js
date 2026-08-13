import React, { useState, useEffect } from "react";
import getState from "./flux.js";

// Don't change, here is where we initialize our context, by default it's just going to be null.
export const Context = React.createContext(null);

// This function injects the global store to any view/component where you want to use it, we will inject the context to layout.js, you can see it here:
const injectContext = PassedComponent => {
	const StoreWrapper = props => {
		const [state, setState] = useState(() =>
			getState({
				setStore: updatedStore =>
					setState(currentState => ({
						...currentState,
						store: { ...currentState.store, ...updatedStore }
					}))
			})
		);

		useEffect(() => {
			state.actions.restoreSession();
		}, []);

		// The initial value for the context is not null anymore, but the current state of this component,
		// the context will now have a getStore, getActions and setStore functions available, because they were declared
		// on the state of this component
		return (
			<Context.Provider value={state}>
				<PassedComponent {...props} />
			</Context.Provider>
		);
	};
	return StoreWrapper;
};

export default injectContext;
