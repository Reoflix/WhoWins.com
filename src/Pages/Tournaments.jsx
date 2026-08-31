import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./tournaments.css";

function Tournaments() {
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  /* =========================================
     LOAD TOURNAMENTS
  ========================================= */

  useEffect(() => {
    loadTournaments();
  }, []);


  async function loadTournaments() {
    setLoading(true);
    setError("");

    try {

      /* ---------------------------------------
         LOAD TOURNAMENTS
      --------------------------------------- */

      const {
        data: tournamentData,
        error: tournamentError,
      } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", {
          ascending: false,
        });


      if (tournamentError) {
        throw tournamentError;
      }


      if (!tournamentData || tournamentData.length === 0) {
        setTournaments([]);
        setLoading(false);
        return;
      }


      /* ---------------------------------------
         LOAD TOURNAMENT CHARACTERS
      --------------------------------------- */

      const tournamentIds =
        tournamentData.map(
          (tournament) => tournament.id
        );


      const {
        data: tournamentCharacters,
        error: characterError,
      } = await supabase
        .from("tournament_characters")
        .select(`
          tournament_id,
          seed,
          character_id,
          characters (
            id,
            name,
            image_url
          )
        `)
        .in(
          "tournament_id",
          tournamentIds
        )
        .order("seed", {
          ascending: true,
        });


      if (characterError) {
        throw characterError;
      }


      /* ---------------------------------------
         CONVERT DATABASE DATA
         INTO CARD DATA
      --------------------------------------- */

      const formattedTournaments =
        tournamentData.map(
          (tournament) => {

            const attachedCharacters =
              (tournamentCharacters || [])
                .filter(
                  (item) =>
                    item.tournament_id ===
                    tournament.id
                )
                .sort(
                  (a, b) =>
                    a.seed - b.seed
                )
                .map((item) => ({
                  id:
                    item.characters?.id ||
                    item.character_id,

                  name:
                    item.characters?.name ||
                    "Unknown",

                  image:
                    item.characters?.image_url ||
                    "",
                }));


            let winner = null;

            if (
              tournament.winner_character_id
            ) {
              const winnerCharacter =
                attachedCharacters.find(
                  (character) =>
                    character.id ===
                    tournament.winner_character_id
                );

              winner =
                winnerCharacter?.name ||
                null;
            }


            return {
              id: tournament.id,

              title:
                tournament.title,

              category:
                tournament.category,

              status:
                formatStatus(
                  tournament.status
                ),

              participants:
                tournament.participants_count ||
                0,

              progress:
                Number(
                  tournament.progress || 0
                ),

              winner,

              description:
                tournament.description ||
                "",

              banner_url:
                tournament.banner_url ||
                null,

              starts_at:
                tournament.starts_at,

              ends_at:
                tournament.ends_at,

              characters:
                attachedCharacters,
            };
          }
        );


      setTournaments(
        formattedTournaments
      );

    } catch (err) {

      console.error(
        "Tournaments load error:",
        err
      );

      setError(
        "Tournaments load nahi ho paaye."
      );

    } finally {

      setLoading(false);

    }
  }


  /* =========================================
     STATUS FORMATTER
  ========================================= */

  function formatStatus(status) {

    if (!status) {
      return "Upcoming";
    }

    const normalized =
      status.toLowerCase();

    if (normalized === "live") {
      return "Live";
    }

    if (
      normalized === "completed"
    ) {
      return "Completed";
    }

    return "Upcoming";
  }


  /* =========================================
     FILTER
  ========================================= */

  const filteredTournaments =
    filter === "All"
      ? tournaments
      : tournaments.filter(
          (tournament) =>
            tournament.status === filter
        );


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="tournaments-page">


      {/* HEADER */}

      <header className="tournaments-header">

        <button
          className="tournaments-back"
          onClick={() => navigate("/")}
        >
          ←
        </button>


        <div>

          <h1>
            Tournaments
          </h1>

          <span>
            Battle. Vote. Crown the champion.
          </span>

        </div>


        <button
          className="tournaments-search"
          type="button"
        >
          ⌕
        </button>

      </header>


      <main className="tournaments-content">


        {/* HERO */}

        <section className="tournaments-hero">

          <div>

            <span className="tournament-label">
              🏆 TOONVERSE CHAMPIONSHIPS
            </span>


            <h2>
              Who will be<br />
              the champion?
            </h2>


            <p>
              Enter the biggest character
              tournaments and crown your favorite.
            </p>

          </div>


          <div className="tournament-trophy">
            🏆
          </div>

        </section>


        {/* FILTERS */}

        <div className="tournament-filters">

          {[
            "All",
            "Live",
            "Upcoming",
            "Completed",
          ].map((item) => (

            <button
              key={item}
              className={
                filter === item
                  ? "tournament-filter active"
                  : "tournament-filter"
              }
              onClick={() =>
                setFilter(item)
              }
            >
              {item}
            </button>

          ))}

        </div>


        {/* SECTION TITLE */}

        <div className="tournaments-title">

          <div>

            <span>
              🔥
            </span>

            <h2>

              {filter === "All"
                ? "Featured Tournaments"
                : `${filter} Tournaments`}

            </h2>

          </div>


          <small>
            {filteredTournaments.length} Events
          </small>

        </div>


        {/* LOADING */}

        {loading && (

          <div className="tournaments-empty">

            <div>
              🏆
            </div>

            <h3>
              Loading tournaments...
            </h3>

            <p>
              Please wait.
            </p>

          </div>

        )}


        {/* ERROR */}

        {!loading && error && (

          <div className="tournaments-empty">

            <div>
              ⚠️
            </div>

            <h3>
              Something went wrong
            </h3>

            <p>
              {error}
            </p>

            <button
              onClick={loadTournaments}
              style={{
                marginTop: "12px",
                padding: "9px 15px",
                borderRadius: "8px",
                border: "1px solid #7936a7",
                background: "#171020",
                color: "#c967ff",
                fontSize: "8px",
                fontWeight: "800",
              }}
            >
              TRY AGAIN
            </button>

          </div>

        )}


        {/* TOURNAMENT LIST */}

        {!loading &&
          !error &&
          filteredTournaments.length > 0 && (

            <section className="tournaments-list">

              {filteredTournaments.map(
                (tournament) => (

                  <article
                    className="tournament-full-card"
                    key={tournament.id}
                  >


                    {/* CARD HEADER */}

                    <div className="tournament-card-top">

                      <div>

                        <span className="tournament-category">
                          {tournament.category}
                        </span>


                        <h3>
                          {tournament.title}
                        </h3>


                        <p>
                          {tournament.description}
                        </p>

                      </div>


                      <span
                        className={`tournament-status ${tournament.status.toLowerCase()}`}
                      >

                        {tournament.status ===
                        "Live"
                          ? "● LIVE"
                          : tournament.status ===
                            "Upcoming"
                          ? "◷ SOON"
                          : "✓ ENDED"}

                      </span>

                    </div>


                    {/* CHARACTERS */}

                    <div className="tournament-characters">

                      {tournament.characters.map(
                        (
                          character,
                          index
                        ) => (

                          <div
                            className="tournament-character"
                            key={
                              character.id
                            }
                          >

                            <div className="tournament-character-image">

                              {character.image ? (

                                <img
                                  src={
                                    character.image
                                  }
                                  alt={
                                    character.name
                                  }
                                  onError={(
                                    e
                                  ) => {
                                    e.currentTarget.style.display =
                                      "none";
                                  }}
                                />

                              ) : (

                                <span>
                                  🎭
                                </span>

                              )}

                            </div>


                            <strong>
                              {character.name}
                            </strong>


                            {index <
                              tournament
                                .characters
                                .length -
                                1 && (

                              <span className="character-vs">
                                VS
                              </span>

                            )}

                          </div>

                        )
                      )}

                    </div>


                    {/* PROGRESS */}

                    <div className="tournament-progress-section">

                      <div className="tournament-progress-info">

                        <span>
                          Tournament Progress
                        </span>

                        <strong>
                          {tournament.progress}%
                        </strong>

                      </div>


                      <div className="tournament-progress">

                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                tournament.progress
                              )
                            )}%`,
                          }}
                        />

                      </div>

                    </div>


                    {/* FOOTER */}

                    <div className="tournament-card-footer">


                      {/* PARTICIPANTS */}

                      <div>

                        <span>
                          👥
                        </span>

                        <strong>
                          {tournament.participants}
                        </strong>

                        <small>
                          Participants
                        </small>

                      </div>


                      {/* WINNER */}

                      {tournament.winner && (

                        <div className="tournament-winner">

                          <span>
                            🏆
                          </span>

                          <div>

                            <small>
                              Champion
                            </small>

                            <strong>
                              {tournament.winner}
                            </strong>

                          </div>

                        </div>

                      )}


                      {/* VIEW BUTTON */}

                      <button
                        onClick={() =>
                          navigate(
                            `/tournaments/${tournament.id}`
                          )
                        }
                      >

                        {tournament.status ===
                        "Completed"
                          ? "VIEW RESULTS"
                          : "VIEW TOURNAMENT"}

                        <span>
                          →
                        </span>

                      </button>

                    </div>

                  </article>

                )
              )}

            </section>

          )}


        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredTournaments.length ===
            0 && (

            <div className="tournaments-empty">

              <div>
                🏆
              </div>

              <h3>
                No tournaments found
              </h3>

              <p>
                Check again later for new events.
              </p>

            </div>

          )}

      </main>


      {/* BOTTOM NAV */}

      <nav className="tournaments-bottom-nav">

        <div
          onClick={() =>
            navigate("/")
          }
        >

          <span>
            ⌂
          </span>

          <small>
            Home
          </small>

        </div>


        <div className="active">

          <span>
            ♜
          </span>

          <small>
            Tournaments
          </small>

        </div>


        <div
          onClick={() =>
            navigate("/characters")
          }
        >

          <span>
            ♡
          </span>

          <small>
            Characters
          </small>

        </div>


        <div
          onClick={() =>
            navigate("/polls")
          }
        >

          <span>
            ▥
          </span>

          <small>
            Polls
          </small>

        </div>


        <div
          onClick={() =>
            navigate("/profile")
          }
        >

          <span>
            ●
          </span>

          <small>
            Profile
          </small>

        </div>

      </nav>

    </div>
  );
}

export default Tournaments;