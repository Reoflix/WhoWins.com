import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./admin.css";

function Admin() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    characters: 0,
    battles: 0,
    polls: 0,
    tournaments: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);

    const [
      charactersResult,
      battlesResult,
      pollsResult,
      tournamentsResult,
    ] = await Promise.all([
      supabase
        .from("characters")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),

      supabase
        .from("battles")
        .select("*", { count: "exact", head: true })
        .eq("status", "live"),

      supabase
        .from("polls")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),

      supabase
        .from("tournaments")
        .select("*", { count: "exact", head: true }),
    ]);

    if (charactersResult.error) {
      console.error(
        "Characters:",
        charactersResult.error
      );
    }

    if (battlesResult.error) {
      console.error(
        "Battles:",
        battlesResult.error
      );
    }

    if (pollsResult.error) {
      console.error(
        "Polls:",
        pollsResult.error
      );
    }

    if (tournamentsResult.error) {
      console.error(
        "Tournaments:",
        tournamentsResult.error
      );
    }

    setStats({
      characters: charactersResult.count || 0,
      battles: battlesResult.count || 0,
      polls: pollsResult.count || 0,
      tournaments: tournamentsResult.count || 0,
    });

    setLoading(false);
  }

  return (
    <div className="admin-page">

      <header className="admin-header">

        <div>
          <span>TOONVERSE</span>
          <h1>Admin Panel</h1>
        </div>

        <button onClick={() => navigate("/")}>
          Exit
        </button>

      </header>


      <main className="admin-content">

        <section className="admin-welcome">

          <div>
            <small>WELCOME BACK</small>

            <h2>
              Control Center ⚡
            </h2>

            <p>
              Manage characters, battles, polls and
              tournaments from one place.
            </p>
          </div>

          <div className="admin-crown">
            👑
          </div>

        </section>


        <section className="admin-stats">

          <div>
            <span>🎭</span>
            <small>Characters</small>

            <strong>
              {loading ? "..." : stats.characters}
            </strong>
          </div>


          <div>
            <span>⚔️</span>
            <small>Live Battles</small>

            <strong>
              {loading ? "..." : stats.battles}
            </strong>
          </div>


          <div>
            <span>🗳️</span>
            <small>Active Polls</small>

            <strong>
              {loading ? "..." : stats.polls}
            </strong>
          </div>


          <div>
            <span>🏆</span>
            <small>Tournaments</small>

            <strong>
              {loading ? "..." : stats.tournaments}
            </strong>
          </div>

        </section>


        <section className="admin-section">

          <div className="admin-section-title">

            <h2>
              Management
            </h2>

            <span>
              CONTROL EVERYTHING
            </span>

          </div>


          <div className="admin-grid">

            <button
              onClick={() =>
                navigate("/admin/characters")
              }
            >
              <span>🎭</span>

              <div>
                <strong>
                  Characters
                </strong>

                <small>
                  Add, edit or remove characters
                </small>
              </div>

              <b>→</b>
            </button>


            <button
              onClick={() =>
                navigate("/admin/battles")
              }
            >
              <span>⚡</span>

              <div>
                <strong>
                  Daily Battles
                </strong>

                <small>
                  Create and manage battles
                </small>
              </div>

              <b>→</b>
            </button>


            <button
              onClick={() =>
                navigate("/admin/polls")
              }
            >
              <span>🗳️</span>

              <div>
                <strong>
                  Polls
                </strong>

                <small>
                  Manage voting polls
                </small>
              </div>

              <b>→</b>
            </button>


            <button
              onClick={() =>
                navigate("/admin/tournaments")
              }
            >
              <span>🏆</span>

              <div>
                <strong>
                  Tournaments
                </strong>

                <small>
                  Create and manage tournaments
                </small>
              </div>

              <b>→</b>
            </button>


            <button
              onClick={() =>
                navigate("/admin/users")
              }
            >
              <span>👥</span>

              <div>
                <strong>
                  Users
                </strong>

                <small>
                  View registered users
                </small>
              </div>

              <b>→</b>
            </button>


            <button>
              <span>⚙️</span>

              <div>
                <strong>
                  Settings
                </strong>

                <small>
                  Admin and website settings
                </small>
              </div>

              <b>→</b>
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Admin;