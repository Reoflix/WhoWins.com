import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";


import { supabase } from "../lib/supabase";

import "./dailyBattle.css";


/* =========================================
   GUEST ID
========================================= */

function getGuestId() {
  let guestId = localStorage.getItem(
    "toonverse_guest_id"
  );

  if (!guestId) {

    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      guestId = crypto.randomUUID();

    } else {

      // Mobile HTTP fallback
      guestId =
        "guest_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
          .toString(36)
          .substring(2, 12);
    }

    localStorage.setItem(
      "toonverse_guest_id",
      guestId
    );
  }

  return guestId;
}


/* =========================================
   PERCENTAGE
========================================= */

function calculatePercent(
  leftVotes,
  rightVotes
) {
  const total =
    Number(leftVotes || 0) +
    Number(rightVotes || 0);

  if (total === 0) {
    return {
      left: 50,
      right: 50,
    };
  }

  return {
    left: Math.round(
      (Number(leftVotes || 0) /
        total) *
        100
    ),

    right: Math.round(
      (Number(rightVotes || 0) /
        total) *
        100
    ),
  };
}


/* =========================================
   COUNTDOWN
========================================= */

function formatTimeLeft(endDate) {
  if (!endDate) {
    return {
      hours: "00",
      minutes: "00",
      seconds: "00",
      ended: true,
    };
  }

  const difference =
    new Date(endDate).getTime() -
    Date.now();

  if (difference <= 0) {
    return {
      hours: "00",
      minutes: "00",
      seconds: "00",
      ended: true,
    };
  }

  const totalSeconds =
    Math.floor(
      difference / 1000
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  return {
    hours: String(hours)
      .padStart(2, "0"),

    minutes: String(minutes)
      .padStart(2, "0"),

    seconds: String(seconds)
      .padStart(2, "0"),

    ended: false,
  };
}


/* =========================================
   DAILY BATTLE
========================================= */

function DailyBattle() {

  const navigate = useNavigate();

  const { battleId } = useParams();

  /* ---------------------------------------
     STATE
  --------------------------------------- */

  const [battle, setBattle] =
    useState(null);

  const [selected, setSelected] =
    useState(null);

  const [voted, setVoted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [voting, setVoting] =
    useState(false);

  const [message, setMessage] =
    useState("");


  const [timeLeft, setTimeLeft] =
    useState({
      hours: "00",
      minutes: "00",
      seconds: "00",
      ended: false,
    });


  /* =======================================
     LOAD BATTLE
  ======================================= */

  useEffect(() => {
    fetchBattle();
  }, []);


  /* =======================================
     COUNTDOWN TIMER
  ======================================= */

  useEffect(() => {

    if (!battle) {
      return;
    }

    updateCountdown();

    const timer =
      setInterval(
        updateCountdown,
        1000
      );

    return () =>
      clearInterval(timer);

  }, [battle]);


  /* =======================================
     FETCH BATTLE
  ======================================= */

  async function fetchBattle() {

  setLoading(true);
  setMessage("");

  try {

    const {
      data,
      error,
    } = await supabase
      .from("battles")
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
        )
      `)
      .eq("id", battleId)
      .maybeSingle();


    if (error) {

      console.error(
        "Battle fetch error:",
        error
      );

      setMessage(
        "Battle load nahi ho paayi: " +
        error.message
      );

      setBattle(null);

      return;
    }


    if (!data) {

      setBattle(null);

      return;
    }


    setBattle(data);

    checkGuestVote(data.id);

  } catch (error) {

    console.error(
      "Unexpected battle error:",
      error
    );

    setMessage(
      "Battle load karte waqt error aa gaya."
    );

    setBattle(null);

  } finally {

    setLoading(false);

  }

}


  /* =======================================
     CHECK GUEST VOTE
  ======================================= */

  async function checkGuestVote(
    battleId
  ) {

    try {

      const guestId =
        getGuestId();


      const {
        data,
        error,
      } = await supabase
        .from("battle_votes")
        .select("id")
        .eq(
          "battle_id",
          battleId
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

        /*
          Vote check fail hone par
          page ko loading par mat roko.
        */

        return;
      }


      setVoted(
        !!data
      );

    } catch (error) {

      console.error(
        "Guest vote check failed:",
        error
      );
    }
  }


  /* =======================================
     COUNTDOWN UPDATE
  ======================================= */

  function updateCountdown() {

    if (!battle) {
      return;
    }

    setTimeLeft(
      formatTimeLeft(
        battle.ends_at
      )
    );
  }


  /* =======================================
     SELECT CHARACTER
  ======================================= */

  function selectCharacter(
    side
  ) {

    if (
      voted ||
      voting
    ) {
      return;
    }

    setSelected(side);

    setMessage("");
  }


  /* =======================================
     HANDLE VOTE
  ======================================= */

  async function handleVote() {

    if (voting) {
      return;
    }


    if (voted) {

      setMessage(
        "You have already voted in this battle."
      );

      return;
    }


    if (!selected) {

      setMessage(
        "Please select a character first."
      );

      return;
    }


    if (timeLeft.ended) {

      setMessage(
        "This battle has ended."
      );

      return;
    }


    const guestId =
      getGuestId();


    const characterId =
      selected === "left"
        ? battle.left_character_id
        : battle.right_character_id;


    setVoting(true);

    setMessage("");


    try {

      const {
        data,
        error,
      } = await supabase.rpc(
        "vote_for_battle_guest",
        {
          p_battle_id:
            battle.id,

          p_character_id:
            characterId,

          p_guest_id:
            guestId,
        }
      );


      /* -------------------------------------
         VOTE ERROR
      ------------------------------------- */

      if (error) {

        console.error(
          "Battle vote error:",
          error
        );


        if (
          error.message.includes(
            "BATTLE_NOT_LIVE"
          )
        ) {

          setMessage(
            "This battle is not live."
          );

        } else if (
          error.message.includes(
            "BATTLE_ENDED"
          )
        ) {

          setMessage(
            "This battle has ended."
          );

        } else {

          setMessage(
            "Vote submit nahi ho paaya."
          );
        }

        return;
      }


      /* -------------------------------------
         ALREADY VOTED
      ------------------------------------- */

      if (
        !data ||
        data.voted === false
      ) {

        setVoted(true);

        setMessage(
          "You have already voted in this battle."
        );

        return;
      }


      /* -------------------------------------
         UPDATE REAL VOTES
      ------------------------------------- */

      setBattle(
        (current) => {

          if (!current) {
            return current;
          }

          return {
            ...current,

            left_votes:
              data.left_votes,

            right_votes:
              data.right_votes,
          };
        }
      );


      setVoted(true);

      setSelected(null);


      setMessage(
        "🔥 Your vote has been counted!"
      );

    } catch (error) {

      console.error(
        "Unexpected vote error:",
        error
      );

      setMessage(
        "Vote submit nahi ho paaya."
      );

    } finally {

      setVoting(false);
    }
  }


  /* =======================================
     LOADING
  ======================================= */

  if (loading) {

    return (
      <div className="daily-page">

        <div
          style={{
            minHeight:
              "100vh",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            color:
              "white",

            fontSize:
              "16px",
          }}
        >
          Loading battle...
        </div>

      </div>
    );
  }


  /* =======================================
     NO BATTLE
  ======================================= */

  if (!battle) {

    return (
      <div className="daily-page">

        <header className="daily-header">

          <button
            className="back-btn"
            onClick={() =>
              navigate("/")
            }
          >
            ←
          </button>


          <div>

            <h1>
              Daily Battle
            </h1>

            <span>
              Choose your champion
            </span>

          </div>


          <div />

        </header>


        <main className="daily-content">

          <section className="info-card">

            <h3>
              NO LIVE BATTLE
            </h3>


            <p>
              {message ||
                "Abhi koi live battle available nahi hai."}
            </p>


            <button
              onClick={
                fetchBattle
              }
              style={{
                marginTop:
                  "15px",

                padding:
                  "10px 18px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #444",

                background:
                  "#151522",

                color:
                  "white",

                cursor:
                  "pointer",
              }}
            >
              Retry
            </button>

          </section>

        </main>

      </div>
    );
  }


  /* =======================================
     PERCENTAGES
  ======================================= */

  const percentages =
    calculatePercent(
      battle.left_votes || 0,
      battle.right_votes || 0
    );


  /* =======================================
     PAGE
  ======================================= */

  return (

    <div className="daily-page">

      {/* =================================
          HEADER
      ================================= */}

      <header className="daily-header">

        <button
          className="back-btn"
          onClick={() =>
            navigate(-1)
          }
        >
          ←
        </button>


        <div>

          <h1>
            Daily Battle
          </h1>

          <span>
            Choose your champion
          </span>

        </div>


        <button
          className="share-btn"
          onClick={() => {

            if (
              navigator.share
            ) {

              navigator.share({
                title:
                  "ToonVerse Daily Battle",

                text:
                  "Vote in today's ToonVerse battle!",

                url:
                  window.location.href,
              });

            }

          }}
        >
          ↗
        </button>

      </header>


      <main className="daily-content">

        {/* =================================
            BATTLE DAY
        ================================= */}

        <div className="battle-day">

          <span>
            🔥 LIVE BATTLE
          </span>


          <small>
            {battle.title}
          </small>

        </div>


        {/* =================================
            CHARACTERS
        ================================= */}

        <section className="battle-intro">

          <div className="intro-character">

            <div className="intro-image">

              {battle
                .left_character
                ?.image_url ? (

                <img
                  src={
                    battle
                      .left_character
                      .image_url
                  }
                  alt={
                    battle
                      .left_character
                      .name
                  }
                />

              ) : (

                <span>
                  ?
                </span>

              )}

            </div>


            <strong>

              {
                battle
                  .left_character
                  ?.name
              }

            </strong>

          </div>


          <div className="big-vs">
            VS
          </div>


          <div className="intro-character">

            <div className="intro-image">

              {battle
                .right_character
                ?.image_url ? (

                <img
                  src={
                    battle
                      .right_character
                      .image_url
                  }
                  alt={
                    battle
                      .right_character
                      .name
                  }
                />

              ) : (

                <span>
                  ?
                </span>

              )}

            </div>


            <strong>

              {
                battle
                  .right_character
                  ?.name
              }

            </strong>

          </div>

        </section>


        {/* =================================
            QUESTION
        ================================= */}

        <h2 className="question">
          WHO IS THE GOAT? 👑
        </h2>


        {/* =================================
            COUNTDOWN
        ================================= */}

        <section className="countdown-card">

          <span>
            Battle Ends In
          </span>


          <div className="countdown">

            <div>

              <strong>
                {timeLeft.hours}
              </strong>

              <small>
                HRS
              </small>

            </div>


            <b>
              :
            </b>


            <div>

              <strong>
                {timeLeft.minutes}
              </strong>

              <small>
                MINS
              </small>

            </div>


            <b>
              :
            </b>


            <div>

              <strong>
                {timeLeft.seconds}
              </strong>

              <small>
                SECS
              </small>

            </div>

          </div>

        </section>


        {/* =================================
            VOTE OPTIONS
        ================================= */}

        <section className="vote-options">

          {/* LEFT */}

          <button
            className={`vote-option blue-option ${
              selected === "left"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              selectCharacter(
                "left"
              )
            }
            disabled={
              voted ||
              voting
            }
          >

            <div className="option-image">

              {battle
                .left_character
                ?.image_url && (

                <img
                  src={
                    battle
                      .left_character
                      .image_url
                  }
                  alt={
                    battle
                      .left_character
                      .name
                  }
                />

              )}

            </div>


            <strong>

              {
                battle
                  .left_character
                  ?.name
              }

            </strong>


            <span>
              {percentages.left}%
            </span>


            <small>

              {(
                battle.left_votes ||
                0
              ).toLocaleString()}{" "}
              Votes

            </small>


            {selected ===
              "left" &&
              !voted && (

                <div className="selected-label">
                  ✓ SELECTED
                </div>

              )}

          </button>


          {/* VS */}

          <div className="option-vs">
            VS
          </div>


          {/* RIGHT */}

          <button
            className={`vote-option red-option ${
              selected === "right"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              selectCharacter(
                "right"
              )
            }
            disabled={
              voted ||
              voting
            }
          >

            <div className="option-image">

              {battle
                .right_character
                ?.image_url && (

                <img
                  src={
                    battle
                      .right_character
                      .image_url
                  }
                  alt={
                    battle
                      .right_character
                      .name
                  }
                />

              )}

            </div>


            <strong>

              {
                battle
                  .right_character
                  ?.name
              }

            </strong>


            <span>
              {percentages.right}%
            </span>


            <small>

              {(
                battle.right_votes ||
                0
              ).toLocaleString()}{" "}
              Votes

            </small>


            {selected ===
              "right" &&
              !voted && (

                <div className="selected-label">
                  ✓ SELECTED
                </div>

              )}

          </button>

        </section>


        {/* =================================
            VOTE BUTTON
        ================================= */}

        <button
          className={`main-vote-btn ${
            voted
              ? "voted-btn"
              : ""
          }`}
          onClick={
            handleVote
          }
          disabled={
            voted ||
            voting
          }
        >

          {voting
            ? "SUBMITTING..."
            : voted
            ? "✓ VOTED"
            : "VOTE NOW"}


          {!voted &&
            !voting && (

              <span>
                →
              </span>

            )}

        </button>


        {/* =================================
            MESSAGE
        ================================= */}

        {message && (

          <div
            className={`vote-message ${
              message.includes(
                "counted"
              )
                ? "success"
                : "warning"
            }`}
          >
            {message}
          </div>

        )}


        {/* =================================
            NOTE
        ================================= */}

        <p className="vote-note">

          {voted
            ? "You have already voted in this battle."
            : "You can vote once in this battle."}

        </p>


        {/* =================================
            ABOUT
        ================================= */}

        <section className="info-card">

          <h3>
            ABOUT THIS BATTLE
          </h3>


          <p>
            Two icons. Two worlds.
            One legendary battle.
            Vote for your childhood
            favorite and see who
            reigns supreme!
          </p>

        </section>

      </main>


      {/* =================================
          BOTTOM NAV
      ================================= */}

      <nav className="daily-bottom-nav">

        <div
          className="daily-nav active"
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
          className="daily-nav"
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


        <div
          className="daily-nav"
          onClick={() =>
            navigate(
              "/characters"
            )
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
          className="daily-nav"
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
          className="daily-nav"
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


export default DailyBattle;