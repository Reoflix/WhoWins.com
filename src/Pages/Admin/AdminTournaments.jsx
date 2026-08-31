import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./adminTournaments.css";

function AdminTournaments() {
  const [characters, setCharacters] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [finalizing, setFinalizing] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "Anime",
    description: "",
    banner_url: "",
    status: "upcoming",
    starts_at: "",
    ends_at: "",
    participants_count: 0,
    progress: 0,
    winner_character_id: "",
    character_ids: [],
  });

  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    const {
      data: adminResult,
      error: adminError,
    } = await supabase.rpc("is_admin");

    if (adminError) {
      console.error(
        "Admin check error:",
        adminError
      );

      setError(
        "Admin verification failed."
      );

      setLoading(false);
      return;
    }

    if (!adminResult) {
      setError(
        "You are not authorized to manage tournaments."
      );

      setLoading(false);
      return;
    }

    await Promise.all([
      loadCharacters(),
      loadTournaments(),
      loadMatches(),
    ]);

    setLoading(false);
  }


  /* =========================================
     LOAD CHARACTERS
  ========================================= */

  async function loadCharacters() {
    const {
      data,
      error,
    } = await supabase
      .from("characters")
      .select(
        "id, name, image_url"
      )
      .order("name");

    if (error) {
      console.error(
        "Characters error:",
        error
      );

      setError(
        "Characters load nahi ho paaye."
      );

      return;
    }

    setCharacters(data || []);
  }


  /* =========================================
     LOAD TOURNAMENTS
  ========================================= */

  async function loadTournaments() {
    const {
      data,
      error,
    } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Tournaments error:",
        error
      );

      setError(
        "Tournaments load nahi ho paaye."
      );

      return;
    }

    setTournaments(data || []);
  }


  /* =========================================
     LOAD MATCHES
  ========================================= */

  async function loadMatches() {
    const {
      data,
      error,
    } = await supabase
      .from("tournament_matches")
      .select(`
        *,
        left_character:left_character_id (
          id,
          name,
          image_url
        ),
        right_character:right_character_id (
          id,
          name,
          image_url
        ),
        winner:winner_character_id (
          id,
          name,
          image_url
        )
      `)
      .order("round", {
        ascending: true,
      })
      .order("match_number", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Matches error:",
        error
      );

      setError(
        "Tournament matches load nahi ho paaye."
      );

      return;
    }

    setMatches(data || []);
  }


  /* =========================================
     FORM CHANGE
  ========================================= */

  function handleChange(e) {
    const {
      name,
      value,
    } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }


  /* =========================================
     CHARACTER SELECT
  ========================================= */

  function toggleCharacter(id) {
    setForm((current) => {

      const alreadySelected =
        current.character_ids.includes(
          id
        );

      if (alreadySelected) {
        return {
          ...current,

          character_ids:
            current.character_ids.filter(
              (characterId) =>
                characterId !== id
            ),

          winner_character_id:
            current.winner_character_id ===
            id
              ? ""
              : current.winner_character_id,
        };
      }

      return {
        ...current,

        character_ids: [
          ...current.character_ids,
          id,
        ],
      };
    });
  }


  /* =========================================
     CREATE TOURNAMENT
  ========================================= */

  async function createTournament(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.title.trim()) {
      setError(
        "Tournament title required hai."
      );

      return;
    }

    if (
      !form.starts_at ||
      !form.ends_at
    ) {
      setError(
        "Start aur End date/time required hai."
      );

      return;
    }

    if (
      new Date(form.ends_at) <=
      new Date(form.starts_at)
    ) {
      setError(
        "End time Start time ke baad hona chahiye."
      );

      return;
    }

    if (
      form.character_ids.length < 2
    ) {
      setError(
        "Kam se kam 2 characters select karo."
      );

      return;
    }

    setCreating(true);

    let createdTournamentId = null;

    try {

      /* CREATE TOURNAMENT */

      const {
        data: tournament,
        error: tournamentError,
      } = await supabase
        .from("tournaments")
        .insert({
          title:
            form.title.trim(),

          category:
            form.category,

          description:
            form.description.trim() ||
            null,

          banner_url:
            form.banner_url.trim() ||
            null,

          status:
            form.status,

          starts_at:
            new Date(
              form.starts_at
            ).toISOString(),

          ends_at:
            new Date(
              form.ends_at
            ).toISOString(),

          participants_count:
            Number(
              form.participants_count
            ) || 0,

          progress:
            Math.min(
              100,
              Math.max(
                0,
                Number(
                  form.progress
                ) || 0
              )
            ),

          winner_character_id:
            form.winner_character_id ||
            null,
        })
        .select()
        .single();

      if (tournamentError) {
        throw tournamentError;
      }

      createdTournamentId =
        tournament.id;


      /* ATTACH CHARACTERS */

      const tournamentCharacters =
        form.character_ids.map(
          (
            characterId,
            index
          ) => ({
            tournament_id:
              tournament.id,

            character_id:
              characterId,

            seed:
              index + 1,
          })
        );


      const {
        error:
          characterError,
      } = await supabase
        .from(
          "tournament_characters"
        )
        .insert(
          tournamentCharacters
        );


      /* ROLLBACK */

      if (characterError) {
        console.error(
          "Tournament characters error:",
          characterError
        );

        if (
          createdTournamentId
        ) {
          await supabase
            .from("tournaments")
            .delete()
            .eq(
              "id",
              createdTournamentId
            );
        }

        throw new Error(
          "Tournament create nahi hua kyunki characters attach nahi ho paaye."
        );
      }


      /* SUCCESS */

      setMessage(
        "🏆 Tournament successfully created!"
      );

      setForm({
        title: "",
        category: "Anime",
        description: "",
        banner_url: "",
        status: "upcoming",
        starts_at: "",
        ends_at: "",
        participants_count: 0,
        progress: 0,
        winner_character_id: "",
        character_ids: [],
      });

      await loadTournaments();

    } catch (err) {

      console.error(
        "Tournament create error:",
        err
      );

      setError(
        err.message ||
          "Tournament create nahi hua."
      );

    } finally {
      setCreating(false);
    }
  }


  /* =========================================
     DELETE TOURNAMENT
  ========================================= */

  async function deleteTournament(
    id
  ) {
    const confirmDelete =
      window.confirm(
        "Kya tum ye tournament delete karna chahte ho?"
      );

    if (!confirmDelete) {
      return;
    }

    setMessage("");
    setError("");

    const {
      error,
    } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Delete tournament error:",
        error
      );

      setError(
        "Tournament delete nahi hua."
      );

      return;
    }

    setMessage(
      "Tournament deleted successfully."
    );

    await Promise.all([
      loadTournaments(),
      loadMatches(),
    ]);
  }


  /* =========================================
     FINALIZE MATCH
  ========================================= */

  async function finalizeMatch(
    matchId
  ) {
    setMessage("");
    setError("");

    setFinalizing(matchId);

    try {

      const {
        data,
        error:
          rpcError,
      } = await supabase.rpc(
        "finalize_tournament_match",
        {
          p_match_id:
            matchId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      console.log(
        "Finalize result:",
        data
      );


      if (
        data?.tournament_completed
      ) {

        setMessage(
          "🏆 Tournament completed! Champion declared."
        );

      } else if (
        data?.next_round_created
      ) {

        setMessage(
          "🔥 Match finalized! Next round automatically created."
        );

      } else {

        setMessage(
          "✓ Match finalized successfully."
        );
      }


      await Promise.all([
        loadMatches(),
        loadTournaments(),
      ]);

    } catch (err) {

      console.error(
        "Finalize error:",
        err
      );

      const errorMessage =
        err?.message || "";

      if (
        errorMessage.includes(
          "MATCH_TIE"
        )
      ) {

        setError(
          "⚠️ Match tie hai. Winner decide nahi ho sakta."
        );

      } else if (
        errorMessage.includes(
          "NOT_ADMIN"
        )
      ) {

        setError(
          "⚠️ Admin permission required."
        );

      } else if (
        errorMessage.includes(
          "MATCH_ALREADY_COMPLETED"
        )
      ) {

        setError(
          "Ye match already finalized hai."
        );

      } else {

        setError(
          "Match finalize nahi ho paaya."
        );
      }

    } finally {
      setFinalizing(null);
    }
  }


  /* =========================================
     CHARACTER NAME
  ========================================= */

  function getCharacterName(
    id
  ) {
    const character =
      characters.find(
        (item) =>
          item.id === id
      );

    return (
      character?.name ||
      "Unknown"
    );
  }


  /* =========================================
     MATCHES FOR TOURNAMENT
  ========================================= */

  function getTournamentMatches(
    tournamentId
  ) {
    return matches.filter(
      (match) =>
        match.tournament_id ===
        tournamentId
    );
  }


  /* =========================================
     MATCH CHARACTER
  ========================================= */

  function MatchCharacter({
    character,
  }) {
    if (!character) {
      return (
        <div className="admin-match-character">

          <div className="admin-match-image">
            🎭
          </div>

          <strong>
            TBD
          </strong>

        </div>
      );
    }

    return (
      <div className="admin-match-character">

        <div className="admin-match-image">

          {character.image_url ? (

            <img
              src={
                character.image_url
              }
              alt={
                character.name
              }
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

      </div>
    );
  }


  /* =========================================
     UI
  ========================================= */

  return (
    <div className="admin-tournaments-page">

      {/* HEADER */}

      <header className="admin-tournaments-header">

        <div>

          <h1>
            🏆 Admin Tournaments
          </h1>

          <span>
            Create & manage ToonVerse tournaments
          </span>

        </div>

      </header>


      <main className="admin-tournaments-content">

        {/* SUCCESS */}

        {message && (
          <div className="admin-success">

            {message}

            <button
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>

          </div>
        )}


        {/* ERROR */}

        {error && (
          <div className="admin-error">

            {error}

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>
        )}


        {/* =====================================
            CREATE TOURNAMENT
        ===================================== */}

        <section className="admin-tournament-card">

          <div className="admin-section-heading">

            <div>

              <h2>
                Create Tournament
              </h2>

              <p>
                Add a new tournament to ToonVerse.
              </p>

            </div>

          </div>


          <form
            onSubmit={
              createTournament
            }
            className="admin-tournament-form"
          >

            {/* TITLE */}

            <div className="admin-field">

              <label>
                Tournament Title
              </label>

              <input
                type="text"
                name="title"
                value={
                  form.title
                }
                onChange={
                  handleChange
                }
                placeholder="Childhood Legends Cup"
              />

            </div>


            {/* CATEGORY */}

            <div className="admin-field">

              <label>
                Category
              </label>

              <select
                name="category"
                value={
                  form.category
                }
                onChange={
                  handleChange
                }
              >

                <option value="Anime">
                  Anime
                </option>

                <option value="Cartoon">
                  Cartoon
                </option>

              </select>

            </div>


            {/* DESCRIPTION */}

            <div className="admin-field full">

              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  form.description
                }
                onChange={
                  handleChange
                }
                placeholder="Describe this tournament..."
                rows="4"
              />

            </div>


            {/* BANNER */}

            <div className="admin-field full">

              <label>
                Banner Image URL
              </label>

              <input
                type="text"
                name="banner_url"
                value={
                  form.banner_url
                }
                onChange={
                  handleChange
                }
                placeholder="https://..."
              />

            </div>


            {/* STATUS */}

            <div className="admin-field">

              <label>
                Status
              </label>

              <select
                name="status"
                value={
                  form.status
                }
                onChange={
                  handleChange
                }
              >

                <option value="upcoming">
                  Upcoming
                </option>

                <option value="live">
                  Live
                </option>

                <option value="completed">
                  Completed
                </option>

              </select>

            </div>


            {/* PARTICIPANTS */}

            <div className="admin-field">

              <label>
                Participants
              </label>

              <input
                type="number"
                min="0"
                name="participants_count"
                value={
                  form.participants_count
                }
                onChange={
                  handleChange
                }
              />

            </div>


            {/* PROGRESS */}

            <div className="admin-field">

              <label>
                Progress (%)
              </label>

              <input
                type="number"
                min="0"
                max="100"
                name="progress"
                value={
                  form.progress
                }
                onChange={
                  handleChange
                }
              />

            </div>


            {/* START */}

            <div className="admin-field">

              <label>
                Start Date & Time
              </label>

              <input
                type="datetime-local"
                name="starts_at"
                value={
                  form.starts_at
                }
                onChange={
                  handleChange
                }
              />

            </div>


            {/* END */}

            <div className="admin-field">

              <label>
                End Date & Time
              </label>

              <input
                type="datetime-local"
                name="ends_at"
                value={
                  form.ends_at
                }
                onChange={
                  handleChange
                }
              />

            </div>


            {/* CHARACTERS */}

            <div className="admin-character-section full">

              <div className="admin-character-heading">

                <div>

                  <label>
                    Tournament Characters
                  </label>

                  <small>
                    Select at least 2 characters
                  </small>

                </div>

                <strong>
                  {
                    form.character_ids.length
                  }
                </strong>

              </div>


              <div className="admin-character-grid">

                {characters.map(
                  (
                    character
                  ) => {

                    const selected =
                      form.character_ids.includes(
                        character.id
                      );

                    return (

                      <button
                        type="button"
                        key={
                          character.id
                        }
                        className={
                          selected
                            ? "admin-character selected"
                            : "admin-character"
                        }
                        onClick={() =>
                          toggleCharacter(
                            character.id
                          )
                        }
                      >

                        <div className="admin-character-image">

                          {character.image_url ? (

                            <img
                              src={
                                character.image_url
                              }
                              alt={
                                character.name
                              }
                            />

                          ) : (

                            <span>
                              🎭
                            </span>

                          )}

                        </div>

                        <strong>
                          {
                            character.name
                          }
                        </strong>

                        {selected && (
                          <span className="admin-character-check">
                            ✓
                          </span>
                        )}

                      </button>

                    );
                  }
                )}

              </div>

            </div>


            {/* WINNER */}

            <div className="admin-field full">

              <label>
                Winner{" "}
                <small>
                  Optional
                </small>
              </label>

              <select
                name="winner_character_id"
                value={
                  form.winner_character_id
                }
                onChange={
                  handleChange
                }
              >

                <option value="">
                  No Winner
                </option>

                {characters
                  .filter(
                    (
                      character
                    ) =>
                      form.character_ids.includes(
                        character.id
                      )
                  )
                  .map(
                    (
                      character
                    ) => (

                      <option
                        key={
                          character.id
                        }
                        value={
                          character.id
                        }
                      >
                        {
                          character.name
                        }
                      </option>

                    )
                  )}

              </select>

            </div>


            {/* CREATE BUTTON */}

            <button
              type="submit"
              className="admin-create-btn"
              disabled={
                creating
              }
            >

              {creating
                ? "CREATING..."
                : "🏆 CREATE TOURNAMENT"}

            </button>

          </form>

        </section>


        {/* =====================================
            EXISTING TOURNAMENTS
        ===================================== */}

        <section className="admin-existing-section">

          <div className="admin-section-heading">

            <div>

              <h2>
                Existing Tournaments
              </h2>

              <p>
                {
                  tournaments.length
                }{" "}
                tournaments
              </p>

            </div>

          </div>


          {loading ? (

            <div className="admin-loading">
              Loading tournaments...
            </div>

          ) : tournaments.length ===
            0 ? (

            <div className="admin-empty">
              No tournaments created yet.
            </div>

          ) : (

            <div className="admin-existing-list">

              {tournaments.map(
                (
                  tournament
                ) => {

                  const tournamentMatches =
                    getTournamentMatches(
                      tournament.id
                    );

                  return (

                    <div
                      className="admin-existing-card"
                      key={
                        tournament.id
                      }
                    >

                      {/* TOURNAMENT INFO */}

                      <div className="admin-existing-info">

                        <span
                          className={`admin-status ${tournament.status}`}
                        >
                          {
                            tournament.status
                          }
                        </span>

                        <h3>
                          {
                            tournament.title
                          }
                        </h3>

                        <small>
                          {
                            tournament.category
                          }
                          {" • "}
                          {
                            tournament.participants_count
                          }
                          {" participants"}
                        </small>


                        {tournament.winner_character_id && (
                          <p>
                            🏆 Winner:{" "}
                            {
                              getCharacterName(
                                tournament.winner_character_id
                              )
                            }
                          </p>
                        )}

                      </div>


                      {/* MATCHES */}

                      {tournamentMatches.length >
                        0 && (

                        <div className="admin-tournament-matches">

                          <div className="admin-matches-title">

                            <h4>
                              ⚔️ Tournament Matches
                            </h4>

                            <span>
                              {
                                tournamentMatches.length
                              }{" "}
                              Matches
                            </span>

                          </div>


                          {tournamentMatches.map(
                            (
                              match
                            ) => (

                              <div
                                className="admin-match-card"
                                key={
                                  match.id
                                }
                              >

                                <div className="admin-match-top">

                                  <span>
                                    ROUND{" "}
                                    {
                                      match.round
                                    }
                                    {" • MATCH "}
                                    {
                                      match.match_number
                                    }
                                  </span>

                                  <strong
                                    className={
                                      `admin-match-status ${match.status}`
                                    }
                                  >
                                    {
                                      match.status ===
                                      "live"
                                        ? "● LIVE"
                                        : match.status ===
                                          "completed"
                                        ? "✓ COMPLETED"
                                        : "◷ UPCOMING"
                                    }
                                  </strong>

                                </div>


                                <div className="admin-match-fighters">

                                  <MatchCharacter
                                    character={
                                      match.left_character
                                    }
                                  />


                                  <div className="admin-match-vs">

                                    <strong>
                                      {
                                        match.left_votes
                                      }
                                      {" - "}
                                      {
                                        match.right_votes
                                      }
                                    </strong>

                                    <span>
                                      VS
                                    </span>

                                  </div>


                                  <MatchCharacter
                                    character={
                                      match.right_character
                                    }
                                  />

                                </div>


                                {/* WINNER */}

                                {match.winner_character_id && (
                                  <div className="admin-match-winner">

                                    🏆 Winner:{" "}

                                    <strong>
                                      {
                                        match
                                          .winner
                                          ?.name ||
                                        getCharacterName(
                                          match.winner_character_id
                                        )
                                      }
                                    </strong>

                                  </div>
                                )}


                                {/* FINALIZE */}

                                {match.status !==
                                  "completed" && (

                                  <button
                                    className="admin-finalize-btn"
                                    disabled={
                                      finalizing ===
                                      match.id
                                    }
                                    onClick={() =>
                                      finalizeMatch(
                                        match.id
                                      )
                                    }
                                  >

                                    {finalizing ===
                                    match.id
                                      ? "FINALIZING..."
                                      : "🏆 FINALIZE MATCH"}

                                  </button>

                                )}

                              </div>

                            )
                          )}

                        </div>

                      )}


                      {/* DELETE */}

                      <button
                        className="admin-delete-btn"
                        onClick={() =>
                          deleteTournament(
                            tournament.id
                          )
                        }
                      >
                        Delete
                      </button>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default AdminTournaments;