import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./characters.css";

function Characters() {
  const navigate = useNavigate();

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCharacters();
  }, []);

  async function fetchCharacters() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("is_active", true)
      .order("votes", { ascending: false });

    if (error) {
      console.error(error);
      setError("Characters load nahi ho paaye.");
    } else {
      setCharacters(data || []);
    }

    setLoading(false);
  }

  return (
    <div className="characters-page">

      {/* HEADER */}
      <header className="characters-header">

        <button onClick={() => navigate("/")}>
          ←
        </button>

        <div>
          <h1>Characters</h1>
          <span>YOUR FAVORITE LEGENDS</span>
        </div>

        <button>
          ⌕
        </button>

      </header>


      <main className="characters-content">

        <div className="characters-title">

          <div>
            <span>❤️</span>
            <h2>Trending Characters</h2>
          </div>

          <small>
            {characters.length} Characters
          </small>

        </div>


        {/* LOADING */}

        {loading && (
          <div className="characters-message">
            Loading characters...
          </div>
        )}


        {/* ERROR */}

        {!loading && error && (
          <div className="characters-message error">
            {error}

            <button onClick={fetchCharacters}>
              Retry
            </button>
          </div>
        )}


        {/* CHARACTERS */}

        {!loading && !error && (
          <div className="characters-grid">

            {characters.map((character, index) => (

              <div
                className="character-box"
                key={character.id}
                onClick={() =>
                  navigate(`/characters/${character.id}`)
                }
              >

                <div className="character-rank">
                  #{index + 1}
                </div>

                <div className="character-box-image">

                  {character.image_url ? (
                    <img
                      src={character.image_url}
                      alt={character.name}
                    />
                  ) : (
                    <div className="no-image">
                      ?
                    </div>
                  )}

                </div>

                <h3>
                  {character.name}
                </h3>

                <span>
                  {character.category}
                </span>

                <small>
                  ❤️ {character.votes || 0} votes
                </small>

              </div>

            ))}

          </div>
        )}


        {/* EMPTY */}

        {!loading &&
          !error &&
          characters.length === 0 && (

            <div className="characters-message">

              <div className="empty-icon">
                🎭
              </div>

              <h3>
                No characters yet
              </h3>

              <p>
                New characters will appear here.
              </p>

            </div>
          )}

      </main>


      {/* BOTTOM NAV */}

      <nav className="characters-bottom-nav">

        <div onClick={() => navigate("/")}>
          <span>⌂</span>
          <small>Home</small>
        </div>

        <div onClick={() => navigate("/tournaments")}>
          <span>♜</span>
          <small>Tournaments</small>
        </div>

        <div className="active">
          <span>♡</span>
          <small>Characters</small>
        </div>

        <div onClick={() => navigate("/polls")}>
          <span>▥</span>
          <small>Polls</small>
        </div>

        <div onClick={() => navigate("/profile")}>
          <span>●</span>
          <small>Profile</small>
        </div>

      </nav>

    </div>
  );
}

export default Characters;