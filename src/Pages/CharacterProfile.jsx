import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./characterprofile.css";


function getGuestId() {
  let guestId =
    localStorage.getItem("toonverse_guest_id");

  if (!guestId) {
    guestId = crypto.randomUUID();

    localStorage.setItem(
      "toonverse_guest_id",
      guestId
    );
  }

  return guestId;
}


function CharacterProfile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [character, setCharacter] =
    useState(null);

  const [characters, setCharacters] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [voted, setVoted] =
    useState(false);

  const [voting, setVoting] =
    useState(false);

  const [message, setMessage] =
    useState("");


  useEffect(() => {
    fetchCharacter();
  }, [id]);


  // ================================
  // FETCH CHARACTER
  // ================================

  async function fetchCharacter() {
    setLoading(true);
    setMessage("");

    const {
      data,
      error,
    } = await supabase
      .from("characters")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();


    if (error) {
      console.error(
        "Character fetch error:",
        error
      );

      setMessage(
        "Character load nahi ho paaya."
      );

      setLoading(false);

      return;
    }


    if (!data) {
      setCharacter(null);

      setLoading(false);

      return;
    }


    setCharacter(data);


    await checkVote(data.id);

    await fetchRelatedCharacters(
      data.id
    );


    setLoading(false);
  }


  // ================================
  // RELATED CHARACTERS
  // ================================

  async function fetchRelatedCharacters(
    characterId
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("characters")
      .select("*")
      .eq("is_active", true)
      .neq("id", characterId)
      .order("votes", {
        ascending: false,
      })
      .limit(4);


    if (error) {
      console.error(
        "Related characters error:",
        error
      );

      return;
    }


    setCharacters(data || []);
  }


  // ================================
  // CHECK EXISTING VOTE
  // ================================

  async function checkVote(
    characterId
  ) {
    const guestId =
      getGuestId();


    const {
      data,
      error,
    } = await supabase
      .from("character_votes")
      .select("id")
      .eq(
        "character_id",
        characterId
      )
      .eq(
        "guest_id",
        guestId
      )
      .maybeSingle();


    if (error) {
      console.error(
        "Vote check error:",
        error
      );

      return;
    }


    setVoted(!!data);
  }


  // ================================
  // VOTE
  // ================================

  async function handleVote() {
    if (!character) {
      return;
    }


    if (voted) {
      setMessage(
        `You already voted for ${character.name}.`
      );

      return;
    }


    if (voting) {
      return;
    }


    const guestId =
      getGuestId();


    setVoting(true);
    setMessage("");


    const {
      data,
      error,
    } = await supabase.rpc(
      "vote_for_character",
      {
        p_character_id:
          character.id,

        p_guest_id:
          guestId,
      }
    );


    if (error) {
      console.error(
        "Vote error:",
        error
      );


      if (
        error.message.includes(
          "CHARACTER_NOT_FOUND"
        )
      ) {
        setMessage(
          "Character is not available."
        );
      } else {
        setMessage(
          "Vote submit nahi ho paaya."
        );
      }


      setVoting(false);

      return;
    }


    // ================================
    // ALREADY VOTED
    // ================================

    if (!data.voted) {
      setVoted(true);

      setMessage(
        `You already voted for ${character.name}.`
      );

      setVoting(false);

      return;
    }


    // ================================
    // SUCCESS
    // ================================

    setCharacter(
      (current) => ({
        ...current,

        votes:
          data.votes,
      })
    );


    setVoted(true);


    setMessage(
      "🔥 Your vote has been counted!"
    );


    setVoting(false);


    fetchRelatedCharacters(
      character.id
    );
  }


  // ================================
  // LOADING
  // ================================

  if (loading) {
    return (
      <div className="character-profile-page">

        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          Loading character...
        </div>

      </div>
    );
  }


  // ================================
  // NOT FOUND
  // ================================

  if (!character) {
    return (
      <div className="profile-not-found">

        <h2>
          Character Not Found
        </h2>

        <button
          onClick={() =>
            navigate("/characters")
          }
        >
          ← Back to Characters
        </button>

      </div>
    );
  }


  // ================================
  // MAIN PAGE
  // ================================

  return (
    <div className="character-profile-page">

      {/* HEADER */}

      <header className="profile-header">

        <button
          className="profile-back"
          onClick={() =>
            navigate("/characters")
          }
        >
          ←
        </button>


        <div>

          <h1>
            Character
          </h1>

          <span>
            ToonVerse Profile
          </span>

        </div>


        <button className="profile-share">
          ↗
        </button>

      </header>


      <main className="profile-content">

        {/* CHARACTER HERO */}

        <section className="character-hero">

          <div className="character-hero-image">

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
              <div className="no-image">
                ?
              </div>
            )}

          </div>


          <div className="character-hero-info">

            <span className="profile-category">

              {character.category ||
                "Character"}

            </span>


            <h2>
              {character.name}
            </h2>


            <p>
              Community favorite character
              on ToonVerse.
            </p>


            <div className="hero-vote-count">

              <span>
                ♥
              </span>

              <strong>
                {character.votes || 0}
              </strong>

              <small>
                Total Votes
              </small>

            </div>

          </div>

        </section>


        {/* VOTE BUTTON */}

        <button
          className={`character-vote-btn ${
            voted ? "voted" : ""
          }`}
          onClick={handleVote}
          disabled={
            voted || voting
          }
        >

          {voting
            ? "VOTING..."
            : voted
            ? "✓ ALREADY VOTED"
            : `♥ VOTE FOR ${character.name.toUpperCase()}`}

        </button>


        {/* VOTE MESSAGE */}

        {message && (

          <div
            className={`profile-vote-message ${
              message.includes("counted")
                ? "success"
                : "warning"
            }`}
          >

            {message}

          </div>

        )}


        {/* COMMUNITY STATS */}

        <section className="profile-section">

          <div className="profile-section-title">

            <h2>
              COMMUNITY STATS
            </h2>

          </div>


          <div className="profile-stats">

            <div className="stat-card">

              <span>
                🏆
              </span>

              <strong>
                —
              </strong>

              <small>
                Current Rank
              </small>

            </div>


            <div className="stat-card">

              <span>
                ♥
              </span>

              <strong>
                {character.votes || 0}
              </strong>

              <small>
                Total Votes
              </small>

            </div>


            <div className="stat-card">

              <span>
                🔥
              </span>

              <strong>
                Trending
              </strong>

              <small>
                Community Status
              </small>

            </div>

          </div>

        </section>


        {/* ABOUT */}

        <section className="profile-info-card">

          <h3>

            ABOUT{" "}
            {character.name.toUpperCase()}

          </h3>


          <p>

            {character.description ||
              `${character.name} is one of the characters currently featured on ToonVerse. Discover battles, polls and community rankings for this character.`}

          </p>

        </section>


        {/* RECENT BATTLES */}

        <section className="profile-section">

          <div className="profile-section-title">

            <h2>
              RECENT BATTLES
            </h2>

            <button
              onClick={() =>
                navigate(
                  "/daily-battle"
                )
              }
            >
              View All
            </button>

          </div>


          <div className="recent-battle-card">

            <div className="recent-character">

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

                <div className="recent-placeholder">
                  ?
                </div>

              )}


              <strong>
                {character.name}
              </strong>

            </div>


            <div className="recent-vs">
              VS
            </div>


            <div className="recent-character">

              <div className="recent-placeholder">
                ?
              </div>

              <strong>
                Opponent
              </strong>

            </div>

          </div>

        </section>


        {/* RELATED CHARACTERS */}

        <section className="profile-section">

          <div className="profile-section-title">

            <h2>
              YOU MAY ALSO LIKE
            </h2>

          </div>


          <div className="related-characters">

            {characters.map(
              (item) => (

                <div
                  className="related-card"
                  key={item.id}
                  onClick={() =>
                    navigate(
                      `/characters/${item.id}`
                    )
                  }
                >

                  <div className="related-image">

                    {item.image_url ? (

                      <img
                        src={
                          item.image_url
                        }
                        alt={
                          item.name
                        }
                      />

                    ) : (

                      <div className="no-image">
                        ?
                      </div>

                    )}

                  </div>


                  <strong>
                    {item.name}
                  </strong>


                  <small>

                    ♥{" "}
                    {item.votes || 0}

                  </small>

                </div>

              )
            )}

          </div>

        </section>

      </main>


      {/* BOTTOM NAV */}

      <nav className="profile-bottom-nav">

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


        <div
          onClick={() =>
            navigate(
              "/tournaments"
            )
          }
        >

          <span>
            ♜
          </span>

          <small>
            Tournaments
          </small>

        </div>


        <div className="active">

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


export default CharacterProfile;