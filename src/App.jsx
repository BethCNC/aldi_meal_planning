import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { ScheduleProvider, useSchedule } from './contexts/ScheduleContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { HomeView } from './pages/HomeView';
import { PantryInputView } from './pages/PantryInputView';
import { RecipeSuggestionsView } from './pages/RecipeSuggestionsView';
import { WeeklyPlanView } from './pages/WeeklyPlanView';
import { GroceryListView } from './pages/GroceryListView';
import { RecipeDetailView } from './pages/RecipeDetailView';
import { PantryView } from './pages/PantryView';
import { CaseStudyView } from './pages/CaseStudyView';
import { OnboardingView } from './pages/OnboardingView';
import { SettingsView } from './pages/SettingsView';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function ProtectedLayout() {
  const { preferences, loading } = useSchedule();

  if (loading) {
    return <LoadingSpinner message="Loading your schedule..." />;
  }

  if (!preferences?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Layout />;
}

function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <ScheduleProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/onboarding" element={<OnboardingView />} />
              <Route path="/" element={<ProtectedLayout />}>
                <Route index element={<HomeView />} />
                <Route path="pantry-input" element={<PantryInputView />} />
                <Route path="recipe-suggestions" element={<RecipeSuggestionsView />} />
                <Route path="weekly-plan" element={<WeeklyPlanView />} />
                <Route path="grocery-list" element={<GroceryListView />} />
                <Route path="recipe/:id" element={<RecipeDetailView />} />
                <Route path="pantry" element={<PantryView />} />
                <Route path="case-study" element={<CaseStudyView />} />
                <Route path="settings" element={<SettingsView />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ScheduleProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  );
}

export default App;
