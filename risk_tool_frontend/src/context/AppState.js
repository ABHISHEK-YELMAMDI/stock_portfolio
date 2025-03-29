import { create } from 'zustand';

const useAppStore = create((set) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  simulations: JSON.parse(localStorage.getItem('simulations')) || [],
  addSimulation: (simulation) =>
    set((state) => {
      const newSimulations = [...state.simulations, simulation];
      localStorage.setItem('simulations', JSON.stringify(newSimulations));
      return { simulations: newSimulations };
    }),
  removeSimulation: (index) =>
    set((state) => {
      const newSimulations = state.simulations.filter((_, i) => i !== index);
      localStorage.setItem('simulations', JSON.stringify(newSimulations));
      return { simulations: newSimulations };
    }),
}));

export default useAppStore;