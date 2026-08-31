import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./Home";
import DailyBattles from "./Pages/DailyBattles";
import DailyBattle from "./Pages/DailyBattle";
import Characters from "./Pages/Characters";
import CharacterProfile from "./Pages/CharacterProfile";
import Polls from "./Pages/Polls";
import Tournaments from "./Pages/Tournaments";
import Profile from "./Pages/Profile";

import AdminLogin from "./Pages/Admin/AdminLogin";
import Admin from "./Pages/Admin/Admin";
import AdminCharacters from "./Pages/Admin/AdminCharacters";
import AdminBattles from "./Pages/Admin/AdminBattles";
import AdminPolls from "./Pages/Admin/AdminPolls";
import AdminTournaments from "./Pages/Admin/AdminTournaments";
import TournamentDetail from "./Pages/TournamentDetail";



function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* USER PAGES */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/daily-battle"
          element={<DailyBattle />}
        />
        <Route
  path="/daily-battles"
  element={<DailyBattles />}
/>

<Route
  path="/daily-battle/:battleId"
  element={<DailyBattle />}
/>

        <Route
          path="/characters"
          element={<Characters />}
        />

        <Route
          path="/characters/:id"
          element={<CharacterProfile />}
        />

        <Route
          path="/polls"
          element={<Polls />}
        />

        <Route
          path="/tournaments"
          element={<Tournaments />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />


        {/* ADMIN */}

        <Route
          path="/admin"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/dashboard"
          element={<Admin />}
        />

        <Route
          path="/admin/characters"
          element={<AdminCharacters />}
        />
        <Route
  path="/admin/battles"
  element={<AdminBattles />}
        />
        <Route
  path="/daily-battle"
  element={<DailyBattle />}
/>

<Route
  path="/dailybattle"
  element={<DailyBattle />}
/>
<Route
  path="/admin/polls"
  element={<AdminPolls />}
/>
<Route
  path="/admin/tournaments"
  element={<AdminTournaments />}
/>
<Route
  path="/tournaments/:id"
  element={<TournamentDetail />}
/>
      </Routes>

    </BrowserRouter>
  );
}

export default App;