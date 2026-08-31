import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./tournamentDetail.css";

function TournamentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [tournament, setTournament] =
    useState(null);

  const [characters, setCharacters] =
    useState([]);

  const [matches, setMatches] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [votingMatch, setVotingMatch] =
    useState(null);

  const [votedMatches, setVotedMatches] =
    useState({});

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadTournament();
  }, [id]);


  /* =========================================
     GUEST ID
  ========================================= */

  function getGuestId() {
    const key = "toonverse_guest_id";

    let guestId =
      localStorage.getItem(key);

    if (!guestId) {
      guestId =
        crypto.randomUUID() +
        "-" +
        Date.now();

      localStorage.setItem(
        key,
        guestId
      );
    }

    return guestId;
  }


  /* =========================================
     LOAD TOURNAMENT
  ========================================= */

  async function loadTournament() {
    setLoading(true);
    setError("");

    try {
      const {
        data: tournamentData,
        error: tournamentError,
      } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (tournamentError) {
        throw tournamentError;
      }


      /* CHARACTERS */

      const {
        data: characterData,
        error: characterError,
      } = await supabase
        .from("tournament_characters")
        .select(`
          tournament_id,
          character_id,
          seed,
          characters (
            id,
            name,
            image_url
          )
        `)
        .eq("tournament_id", id)
        .order("seed", {
          ascending: true,
        });

      if (characterError) {
        throw characterError;
      }


      /* MATCHES */

      const {
        data: matchData,
        error: matchError,
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
        .eq("tournament_id", id)
        .order("round", {
          ascending: true,
        })
        .order("match_number", {
          ascending: true,
        });

      if (matchError) {
        throw matchError;
      }


      setTournament(tournamentData);


      setCharacters(
        (characterData || []).map(
          (item) => ({
            id:
              item.characters?.id ||
              item.character_id,

            name:
              item.characters?.name ||
              "Unknown",

            image:
              item.characters?.image_url ||
              "",

            seed: item.seed,
          })
        )
      );


      setMatches(matchData || []);

      checkExistingVotes(
        matchData || []
      );

    } catch (err) {
      console.error(
        "Tournament detail error:",
        err
      );

      setError(
        "Tournament load nahi ho paaya."
      );

    } finally {
      setLoading(false);
    }
  }


  /* =========================================
     CHECK EXISTING VOTES
  ========================================= */

  async function checkExistingVotes(
    matchData
  ) {
    if (!matchData?.length) {
      return;
    }

    const guestId =
      getGuestId();

    const matchIds =
      matchData.map(
        (match) => match.id
      );

    const {
      data,
      error: voteError,
    } = await supabase
      .from("tournament_votes")
      .select("match_id")
      .eq("guest_id", guestId)
      .in("match_id", matchIds);

    if (voteError) {
      console.error(
        "Existing vote check:",
        voteError
      );

      return;
    }

    const voted = {};

    (data || []).forEach(
      (vote) => {
        voted[vote.match_id] = true;
      }
    );

    setVotedMatches(voted);
  }


  /* =========================================
     VOTE
  ========================================= */

  async function vote(
    match,
    characterId
  ) {
    setMessage("");
    setError("");

    if (match.status !== "live") {
      setError(
        match.status === "upcoming"
          ? "Voting abhi start nahi hui hai."
          : "Ye match voting ke liye available nahi hai."
      );

      return;
    }

    if (votedMatches[match.id]) {
      setMessage(
        "Tum is match mein already vote kar chuke ho."
      );

      return;
    }

    setVotingMatch(match.id);

    try {
      const guestId =
        getGuestId();

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "vote_for_tournament_match",
        {
          p_match_id: match.id,
          p_character_id: characterId,
          p_guest_id: guestId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error(
          "No response from voting system."
        );
      }

      if (data.voted === false) {
        setVotedMatches(
          (current) => ({
            ...current,
            [match.id]: true,
          })
        );

        setMessage(
          "Tum is match mein already vote kar chuke ho."
        );

        return;
      }


      /* UPDATE VOTES */

      setMatches(
        (currentMatches) =>
          currentMatches.map(
            (currentMatch) => {

              if (
                currentMatch.id !==
                match.id
              ) {
                return currentMatch;
              }

              return {
                ...currentMatch,

                left_votes:
                  data.left_votes,

                right_votes:
                  data.right_votes,
              };
            }
          )
      );


      setVotedMatches(
        (current) => ({
          ...current,
          [match.id]: true,
        })
      );


      setMessage(
        "🔥 Vote successfully submitted!"
      );

    } catch (err) {
      console.error(
        "Tournament vote error:",
        err
      );

      if (
        err.message?.includes(
          "MATCH_NOT_LIVE"
        )
      ) {
        setError(
          "Voting abhi active nahi hai."
        );

      } else if (
        err.message?.includes(
          "INVALID_CHARACTER"
        )
      ) {
        setError(
          "Invalid character selected."
        );

      } else if (
        err.message?.includes(
          "INVALID_GUEST"
        )
      ) {
        setError(
          "Guest ID invalid hai."
        );

      } else {
        setError(
          "Vote submit nahi ho paaya."
        );
      }

    } finally {
      setVotingMatch(null);
    }
  }


  /* =========================================
     STATUS
  ========================================= */

  function getStatus(status) {
    if (!status) {
      return "Upcoming";
    }

    const value =
      status.toLowerCase();

    if (value === "live") {
      return "Live";
    }

    if (value === "completed") {
      return "Completed";
    }

    return "Upcoming";
  }


  /* =========================================
     VOTE PERCENTAGE
  ========================================= */

  function getPercentage(
    votes,
    total
  ) {
    if (!total) {
      return 0;
    }

    return Math.round(
      (votes / total) * 100
    );
  }


  /* =========================================
     BRACKET DATA
  ========================================= */

  const rounds =
    matches.reduce(
      (result, match) => {

        const roundNumber =
          match.round;

        if (!result[roundNumber]) {
          result[roundNumber] = [];
        }

        result[roundNumber].push(
          match
        );

        return result;

      },
      {}
    );

function getRoundName(round) {
  const totalCharacters = characters.length;

  // 2 players
  if (totalCharacters === 2) {
    return "FINAL";
  }

  // 4 players
  if (totalCharacters === 4) {
    if (round === 1) return "SEMI FINAL";
    if (round === 2) return "FINAL";
  }

  // 8 players
  if (totalCharacters === 8) {
    if (round === 1) return "QUARTER FINAL";
    if (round === 2) return "SEMI FINAL";
    if (round === 3) return "FINAL";
  }

  // 16 players
  if (totalCharacters === 16) {
    if (round === 1) return "ROUND OF 16";
    if (round === 2) return "QUARTER FINAL";
    if (round === 3) return "SEMI FINAL";
    if (round === 4) return "FINAL";
  }

  return `ROUND ${round}`;
}


  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="tournament-detail-page">

        <div className="tournament-detail-loading">

          <div>
            🏆
          </div>

          <h2>
            Loading Tournament...
          </h2>

          <p>
            Please wait.
          </p>

        </div>

      </div>
    );
  }


  /* =========================================
     ERROR / NOT FOUND
  ========================================= */

  if (!tournament) {
    return (
      <div className="tournament-detail-page">

        <div className="tournament-detail-error">

          <div>
            ⚠️
          </div>

          <h2>
            Tournament not found
          </h2>

          <p>
            {error ||
              "Tournament load nahi ho paaya."}
          </p>

          <button
            onClick={() =>
              navigate("/tournaments")
            }
          >
            ← Back to Tournaments
          </button>

        </div>

      </div>
    );
  }


  const status =
    getStatus(
      tournament.status
    );


  const progress =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          tournament.progress || 0
        )
      )
    );


  /* CHAMPION */

  const champion =
    matches.find(
      (match) =>
        match.winner_character_id ===
        tournament.winner_character_id
    )?.winner;


  return (
    <div className="tournament-detail-page">


      {/* HEADER */}

      <header className="tournament-detail-header">

        <button
          onClick={() =>
            navigate(
              "/tournaments"
            )
          }
        >
          ←
        </button>


        <div>

          <span>
            TOONVERSE
          </span>

          <h1>
            Tournament
          </h1>

        </div>


        <div className="tournament-header-icon">
          🏆
        </div>

      </header>


      <main className="tournament-detail-content">


        {/* HERO */}

        <section className="tournament-detail-hero">

          <div>

            <span className="detail-category">
              {tournament.category}
            </span>

            <h2>
              {tournament.title}
            </h2>

            <p>
              {tournament.description}
            </p>

          </div>


          <span
            className={
              `detail-status ${status.toLowerCase()}`
            }
          >
            {status === "Live"
              ? "● LIVE"
              : status === "Upcoming"
              ? "◷ UPCOMING"
              : "✓ COMPLETED"}
          </span>

        </section>


        {/* STATS */}

        <section className="tournament-detail-stats">

          <div>

            <span>
              👥
            </span>

            <small>
              Participants
            </small>

            <strong>
              {tournament.participants_count ||
                0}
            </strong>

          </div>


          <div>

            <span>
              📈
            </span>

            <small>
              Progress
            </small>

            <strong>
              {progress}%
            </strong>

          </div>


          <div>

            <span>
              🎭
            </span>

            <small>
              Characters
            </small>

            <strong>
              {characters.length}
            </strong>

          </div>

        </section>


        {/* PROGRESS */}

        <section className="detail-progress-card">

          <div className="detail-progress-top">

            <span>
              Tournament Progress
            </span>

            <strong>
              {progress}%
            </strong>

          </div>


          <div className="detail-progress-bar">

            <div
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </section>


        {/* MESSAGES */}

        {message && (

          <div className="tournament-vote-message">
            {message}
          </div>

        )}


        {error && (

          <div className="tournament-vote-error">
            {error}
          </div>

        )}


        {/* =====================================
            TOURNAMENT BRACKET
        ===================================== */}

        {matches.length > 0 && (

          <section className="tournament-bracket-section">

            <div className="detail-section-title">

              <div>

                <span>
                  🏆
                </span>

                <h2>
                  Tournament Bracket
                </h2>

              </div>

              <small>
                {Object.keys(rounds).length}
                {" Rounds"}
              </small>

            </div>


            <div className="bracket-scroll">

              <div className="tournament-bracket">


                {Object.entries(rounds).map(
                  ([round, roundMatches]) => (

                    <div
                      className="bracket-round"
                      key={round}
                    >

                      <h3>
                        {getRoundName(
                          Number(round)
                        )}
                      </h3>


                      <div className="bracket-round-matches">

                        {roundMatches.map(
                          (match) => (

                            <div
                              className={
                                `bracket-match ${match.status}`
                              }
                              key={match.id}
                            >

                              <div
                                className={
                                  "bracket-player " +
                                  (
                                    match.winner_character_id ===
                                    match.left_character_id
                                      ? "winner"
                                      : ""
                                  )
                                }
                              >

                                <span>
                                  {match.left_character?.name ||
                                    "TBD"}
                                </span>

                                <strong>
                                  {match.left_votes || 0}
                                </strong>

                              </div>


                              <div
                                className={
                                  "bracket-player " +
                                  (
                                    match.winner_character_id ===
                                    match.right_character_id
                                      ? "winner"
                                      : ""
                                  )
                                }
                              >

                                <span>
                                  {match.right_character?.name ||
                                    "TBD"}
                                </span>

                                <strong>
                                  {match.right_votes || 0}
                                </strong>

                              </div>


                              <small
                                className={
                                  `bracket-status ${match.status}`
                                }
                              >

                                {match.status === "live"
                                  ? "● LIVE"
                                  : match.status === "completed"
                                  ? "✓ DONE"
                                  : "◷ SOON"}

                              </small>

                            </div>

                          )
                        )}

                      </div>

                    </div>

                  )
                )}


                {/* CHAMPION */}

                {champion && (

                  <div className="bracket-champion">

                    <span>
                      🏆
                    </span>

                    <small>
                      CHAMPION
                    </small>

                    <strong>
                      {champion.name}
                    </strong>

                  </div>

                )}

              </div>

            </div>

          </section>

        )}


        {/* =====================================
            MATCHES / VOTING
        ===================================== */}

        <section className="tournament-matches-section">

          <div className="detail-section-title">

            <div>

              <span>
                ⚔️
              </span>

              <h2>
                Tournament Battles
              </h2>

            </div>


            <small>
              {matches.length}
              {" Matches"}
            </small>

          </div>


          {matches.length === 0 ? (

            <div className="tournament-no-matches">

              <div>
                ⚔️
              </div>

              <h3>
                Battles Coming Soon
              </h3>

              <p>
                Tournament matches haven't
                been generated yet.
              </p>

            </div>

          ) : (

            <div className="tournament-matches-list">

              {matches.map(
                (match) => {

                  const leftVotes =
                    Number(
                      match.left_votes || 0
                    );

                  const rightVotes =
                    Number(
                      match.right_votes || 0
                    );

                  const totalVotes =
                    leftVotes +
                    rightVotes;

                  const leftPercentage =
                    getPercentage(
                      leftVotes,
                      totalVotes
                    );

                  const rightPercentage =
                    getPercentage(
                      rightVotes,
                      totalVotes
                    );

                  const alreadyVoted =
                    !!votedMatches[
                      match.id
                    ];

                  const isVoting =
                    votingMatch ===
                    match.id;


                  return (

                    <article
                      className="tournament-match-card"
                      key={match.id}
                    >


                      {/* MATCH HEADER */}

                      <div className="match-header">

                        <span>
                          ROUND{" "}
                          {match.round}
                        </span>

                        <strong>
                          MATCH{" "}
                          {match.match_number}
                        </strong>


                        <small
                          className={
                            match.status
                          }
                        >

                          {match.status ===
                          "live"
                            ? "● LIVE"
                            : match.status ===
                              "completed"
                            ? "✓ ENDED"
                            : "◷ SOON"}

                        </small>

                      </div>


                      {/* FIGHTERS */}

                      <div className="match-fighters">


                        {/* LEFT */}

                        <div
                          className={
                            "match-fighter " +
                            (
                              match.winner_character_id ===
                              match.left_character_id
                                ? "winner"
                                : ""
                            )
                          }
                        >

                          <div className="match-character-image">

                            {match
                              .left_character
                              ?.image_url ? (

                              <img
                                src={
                                  match
                                    .left_character
                                    .image_url
                                }
                                alt={
                                  match
                                    .left_character
                                    .name
                                }
                              />

                            ) : (

                              <span>
                                🎭
                              </span>

                            )}

                          </div>


                          <strong>

                            {match
                              .left_character
                              ?.name ||
                              "TBD"}

                          </strong>


                          <small>
                            {leftVotes}
                            {" Votes"}
                          </small>


                          <div className="match-vote-bar">

                            <div
                              style={{
                                width:
                                  `${leftPercentage}%`,
                              }}
                            />

                          </div>


                          <button
                            disabled={
                              match.status !==
                                "live" ||
                              alreadyVoted ||
                              isVoting ||
                              !match.left_character_id
                            }
                            onClick={() =>
                              vote(
                                match,
                                match.left_character_id
                              )
                            }
                          >

                            {isVoting
                              ? "..."
                              : alreadyVoted
                              ? "VOTED"
                              : match.status ===
                                "live"
                              ? "VOTE NOW"
                              : "NOT LIVE"}

                          </button>

                        </div>


                        {/* VS */}

                        <div className="match-vs">
                          VS
                        </div>


                        {/* RIGHT */}

                        <div
                          className={
                            "match-fighter " +
                            (
                              match.winner_character_id ===
                              match.right_character_id
                                ? "winner"
                                : ""
                            )
                          }
                        >

                          <div className="match-character-image">

                            {match
                              .right_character
                              ?.image_url ? (

                              <img
                                src={
                                  match
                                    .right_character
                                    .image_url
                                }
                                alt={
                                  match
                                    .right_character
                                    .name
                                }
                              />

                            ) : (

                              <span>
                                🎭
                              </span>

                            )}

                          </div>


                          <strong>

                            {match
                              .right_character
                              ?.name ||
                              "TBD"}

                          </strong>


                          <small>
                            {rightVotes}
                            {" Votes"}
                          </small>


                          <div className="match-vote-bar">

                            <div
                              style={{
                                width:
                                  `${rightPercentage}%`,
                              }}
                            />

                          </div>


                          <button
                            disabled={
                              match.status !==
                                "live" ||
                              alreadyVoted ||
                              isVoting ||
                              !match.right_character_id
                            }
                            onClick={() =>
                              vote(
                                match,
                                match.right_character_id
                              )
                            }
                          >

                            {isVoting
                              ? "..."
                              : alreadyVoted
                              ? "VOTED"
                              : match.status ===
                                "live"
                              ? "VOTE NOW"
                              : "NOT LIVE"}

                          </button>

                        </div>

                      </div>


                      {/* TOTAL VOTES */}

                      <div className="match-total-votes">

                        <span>

                          {totalVotes}
                          {" total votes"}

                        </span>


                        {alreadyVoted && (

                          <strong>
                            ✓ You voted
                          </strong>

                        )}

                      </div>

                    </article>

                  );

                }
              )}

            </div>

          )}

        </section>


        {/* =====================================
            CHARACTERS
        ===================================== */}

        <section className="detail-characters-section">

          <div className="detail-section-title">

            <div>

              <span>
                🎭
              </span>

              <h2>
                Tournament Characters
              </h2>

            </div>


            <small>

              {characters.length}
              {" Fighters"}

            </small>

          </div>


          <div className="detail-characters-grid">

            {characters.map(
              (character) => (

                <article
                  className="detail-character-card"
                  key={character.id}
                >

                  <div className="detail-seed">

                    #{character.seed}

                  </div>


                  <div className="detail-character-image">

                    {character.image ? (

                      <img
                        src={
                          character.image
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


                  <small>
                    Seed {character.seed}
                  </small>

                </article>

              )
            )}

          </div>

        </section>


        {/* BACK */}

        <button
          className="detail-back-button"
          onClick={() =>
            navigate("/tournaments")
          }
        >
          ← BACK TO TOURNAMENTS
        </button>

      </main>


      {/* BOTTOM NAV */}

      <nav className="tournament-detail-nav">

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


        <div>

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

export default TournamentDetail;