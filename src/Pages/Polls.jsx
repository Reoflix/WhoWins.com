import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./polls.css";


/* =========================================
   GUEST ID
========================================= */

function getGuestId() {
  let id = localStorage.getItem(
    "toonverse_guest_id"
  );

  if (!id) {

    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      id = crypto.randomUUID();

    } else {

      // Mobile HTTP fallback
      id =
        "guest_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
          .toString(36)
          .substring(2, 12);
    }

    localStorage.setItem(
      "toonverse_guest_id",
      id
    );
  }

  return id;
}


/* =========================================
   STATUS
========================================= */

function getStatus(poll) {

  const now = Date.now();

  const start =
    new Date(
      poll.starts_at
    ).getTime();

  const end =
    new Date(
      poll.ends_at
    ).getTime();


  if (!poll.is_active) {
    return "ENDED";
  }


  if (now < start) {
    return "UPCOMING";
  }


  if (now >= end) {
    return "ENDED";
  }


  return "LIVE";
}


/* =========================================
   PERCENTAGE
========================================= */

function getPercent(
  left,
  right
) {

  const total =
    left + right;


  if (total === 0) {

    return {
      left: 50,
      right: 50,
    };
  }


  return {

    left: Math.round(
      (left / total) * 100
    ),

    right: Math.round(
      (right / total) * 100
    ),
  };
}


/* =========================================
   TIME LEFT
========================================= */

function getTimeLeft(
  endTime,
  now
) {

  const difference =
    new Date(
      endTime
    ).getTime() - now;


  if (difference <= 0) {
    return "00:00:00";
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


  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}


/* =========================================
   POLLS
========================================= */

function Polls() {

  const navigate =
    useNavigate();


  /* ---------------------------------------
     STATE
  --------------------------------------- */

  const [polls, setPolls] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState("all");

  const [now, setNow] =
    useState(Date.now());

  const [message, setMessage] =
    useState("");

  const [votingPoll, setVotingPoll] =
    useState(null);


  /*
    Selected option before actual vote.

    Example:

    {
      "poll-id": "left"
    }
  */

  const [selectedOptions, setSelectedOptions] =
    useState({});


  /*
    Already voted polls.

    Example:

    {
      "poll-id": "left"
    }
  */

  const [votedPolls, setVotedPolls] =
    useState(() => {

      try {

        return (
          JSON.parse(
            localStorage.getItem(
              "toonverse_poll_votes"
            )
          ) || {}
        );

      } catch {

        return {};
      }

    });


  /* =======================================
     LOAD POLLS
  ======================================= */

  useEffect(() => {

    fetchPolls();

  }, []);


  async function fetchPolls() {

    setLoading(true);

    setMessage("");


    const {
      data,
      error,
    } = await supabase
      .from("polls")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false,
        }
      );


    if (error) {

      console.error(
        "Poll fetch error:",
        error
      );

      setMessage(
        "Polls load nahi ho paaye."
      );

      setPolls([]);

    } else {

      setPolls(
        data || []
      );
    }


    setLoading(false);
  }


  /* =======================================
     CLOCK
  ======================================= */

  useEffect(() => {

    const timer =
      setInterval(() => {

        setNow(
          Date.now()
        );

      }, 1000);


    return () =>
      clearInterval(timer);

  }, []);


  /* =======================================
     SELECT OPTION
  ======================================= */

  function selectOption(
    poll,
    option
  ) {

    const status =
      getStatus(poll);


    if (status !== "LIVE") {

      setMessage(
        status === "ENDED"
          ? "This poll has ended."
          : "This poll has not started yet."
      );

      return;
    }


    if (votedPolls[poll.id]) {

      setMessage(
        "You have already voted on this poll."
      );

      return;
    }


    if (votingPoll === poll.id) {
      return;
    }


    /*
      Only select.

      Actual vote will happen
      when VOTE NOW is clicked.
    */

    setSelectedOptions(
      (current) => ({
        ...current,
        [poll.id]: option,
      })
    );


    setMessage("");
  }


  /* =======================================
     ACTUAL VOTE
  ======================================= */

  async function handleVote(
    poll
  ) {

    const status =
      getStatus(poll);


    if (status !== "LIVE") {

      setMessage(
        status === "ENDED"
          ? "This poll has ended."
          : "This poll has not started yet."
      );

      return;
    }


    if (votedPolls[poll.id]) {

      setMessage(
        "You have already voted on this poll."
      );

      return;
    }


    const selected =
      selectedOptions[poll.id];


    /*
      User must select first.
    */

    if (!selected) {

      setMessage(
        "Please select an option first."
      );

      return;
    }


    const guestId =
      getGuestId();


    setVotingPoll(
      poll.id
    );

    setMessage(
      "Submitting vote..."
    );


    try {

      const {
        data,
        error,
      } = await supabase.rpc(
        "vote_for_poll",
        {
          p_poll_id:
            poll.id,

          p_option:
            selected,

          p_guest_id:
            guestId,
        }
      );


      /* -----------------------------------
         ERROR
      ----------------------------------- */

      if (error) {

        console.error(
          "POLL VOTE ERROR:",
          error
        );

        setMessage(
          "Vote error: " +
            error.message
        );

        return;
      }


      /* -----------------------------------
         ALREADY VOTED
      ----------------------------------- */

      if (
        data?.voted === false
      ) {

        setVotedPolls(
          (current) => ({
            ...current,
            [poll.id]: true,
          })
        );


        setMessage(
          "You have already voted on this poll."
        );


        return;
      }


      /* -----------------------------------
         SAVE LOCAL VOTE
      ----------------------------------- */

      const updatedVotes = {

        ...votedPolls,

        [poll.id]:
          selected,
      };


      setVotedPolls(
        updatedVotes
      );


      localStorage.setItem(
        "toonverse_poll_votes",
        JSON.stringify(
          updatedVotes
        )
      );


      /* -----------------------------------
         UPDATE REAL COUNTS
      ----------------------------------- */

      setPolls(
        (current) =>

          current.map(
            (item) => {

              if (
                item.id !==
                poll.id
              ) {

                return item;
              }


              return {

                ...item,

                left_votes:
                  data.left_votes,

                right_votes:
                  data.right_votes,
              };
            }
          )
      );


      /* -----------------------------------
         REMOVE SELECTION
      ----------------------------------- */

      setSelectedOptions(
        (current) => {

          const updated = {
            ...current,
          };

          delete updated[
            poll.id
          ];

          return updated;
        }
      );


      setMessage(
        "🔥 Your vote has been counted!"
      );

    } catch (error) {

      console.error(
        "Unexpected poll vote error:",
        error
      );

      setMessage(
        "Vote submit nahi ho saka."
      );

    } finally {

      setVotingPoll(
        null
      );
    }
  }


  /* =======================================
     FILTER
  ======================================= */

  const filteredPolls =
    polls.filter(
      (poll) => {

        const status =
          getStatus(poll);


        if (
          filter === "live"
        ) {

          return (
            status === "LIVE"
          );
        }


        if (
          filter === "anime"
        ) {

          return (
            poll.category
              ?.toLowerCase() ===
            "anime"
          );
        }


        if (
          filter === "cartoon"
        ) {

          return (
            poll.category
              ?.toLowerCase() ===
            "cartoon"
          );
        }


        if (
          filter === "completed"
        ) {

          return (
            status === "ENDED"
          );
        }


        return true;
      }
    );


  /* =======================================
     RETURN
  ======================================= */

  return (

    <div className="tv-polls-page">


      {/* =================================
          HEADER
      ================================= */}

      <header className="tv-polls-header">

        <button
          className="tv-polls-header-btn"
          onClick={() =>
            navigate("/")
          }
        >
          ←
        </button>


        <div className="tv-polls-header-title">

          <h1>
            All Polls
          </h1>

          <span>
            COMMUNITY VOTING
          </span>

        </div>


        <button
          className="tv-polls-header-btn"
          onClick={
            fetchPolls
          }
        >
          ↻
        </button>

      </header>


      <main className="tv-polls-content">


        {/* =================================
            TITLE
        ================================= */}

        <section className="tv-polls-title">

          <div className="tv-polls-title-row">

            <span>
              🗳️
            </span>

            <h2>
              Community Polls
            </h2>

          </div>


          <small>
            {polls.length} Polls
          </small>

        </section>


        {/* =================================
            FILTERS
        ================================= */}

        <div className="tv-polls-filters">

          <button
            className={
              filter === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            All
          </button>


          <button
            className={
              filter === "live"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("live")
            }
          >
            🔴 Live
          </button>


          <button
            className={
              filter === "anime"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("anime")
            }
          >
            Anime
          </button>


          <button
            className={
              filter === "cartoon"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("cartoon")
            }
          >
            Cartoon
          </button>


          <button
            className={
              filter === "completed"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("completed")
            }
          >
            Completed
          </button>

        </div>


        {/* =================================
            MESSAGE
        ================================= */}

        {message && (

          <div className="tv-polls-message">

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


        {/* =================================
            LOADING
        ================================= */}

        {loading && (

          <div className="tv-polls-empty">

            Loading polls...

          </div>

        )}


        {/* =================================
            POLLS
        ================================= */}

        {!loading &&
          filteredPolls.length > 0 && (

            <div className="tv-polls-list">

              {filteredPolls.map(
                (poll) => {

                  const status =
                    getStatus(
                      poll
                    );


                  const leftVotes =
                    Number(
                      poll.left_votes ||
                        0
                    );


                  const rightVotes =
                    Number(
                      poll.right_votes ||
                        0
                    );


                  const totalVotes =
                    leftVotes +
                    rightVotes;


                  const percentage =
                    getPercent(
                      leftVotes,
                      rightVotes
                    );


                  const alreadyVoted =
                    Boolean(
                      votedPolls[
                        poll.id
                      ]
                    );


                  const selected =
                    selectedOptions[
                      poll.id
                    ];


                  const isVoting =
                    votingPoll ===
                    poll.id;


                  return (

                    <article
                      className="tv-polls-card"
                      key={poll.id}
                    >


                      {/* =====================
                          TOP
                      ===================== */}

                      <div className="tv-polls-card-top">

                        <div className="tv-polls-badges">

                          <span
                            className={`tv-polls-status ${status.toLowerCase()}`}
                          >
                            {status}
                          </span>


                          <span className="tv-polls-category">

                            {poll.category}

                          </span>

                        </div>


                        <span className="tv-polls-time">

                          {status ===
                          "LIVE"

                            ? getTimeLeft(
                                poll.ends_at,
                                now
                              )

                            : status ===
                              "UPCOMING"

                            ? "COMING SOON"

                            : "ENDED"}

                        </span>

                      </div>


                      {/* =====================
                          QUESTION
                      ===================== */}

                      <h3 className="tv-polls-question">

                        {poll.title}

                      </h3>


                      {/* =====================
                          OPTIONS
                      ===================== */}

                      <div className="tv-polls-options">


                        {/* LEFT */}

                        <button
                          type="button"
                          className={`tv-polls-option ${
                            selected ===
                            "left"
                              ? "selected"
                              : ""
                          }`}
                          disabled={
                            status !==
                              "LIVE" ||
                            alreadyVoted ||
                            isVoting
                          }
                          onClick={() =>
                            selectOption(
                              poll,
                              "left"
                            )
                          }
                        >

                          <div className="tv-polls-image">

                            {poll.left_image_url ? (

                              <img
                                src={
                                  poll.left_image_url
                                }
                                alt={
                                  poll.left_name
                                }
                              />

                            ) : (

                              <span>
                                🎭
                              </span>

                            )}

                          </div>


                          <strong>

                            {poll.left_name}

                          </strong>


                          <b>

                            {percentage.left}%

                          </b>


                          <small>

                            {leftVotes.toLocaleString()}{" "}
                            Votes

                          </small>


                          {selected ===
                            "left" &&
                            !alreadyVoted && (

                              <div
                                className="poll-selected-label"
                              >
                                ✓ SELECTED
                              </div>

                            )}

                        </button>


                        {/* VS */}

                        <div className="tv-polls-vs">

                          VS

                        </div>


                        {/* RIGHT */}

                        <button
                          type="button"
                          className={`tv-polls-option ${
                            selected ===
                            "right"
                              ? "selected"
                              : ""
                          }`}
                          disabled={
                            status !==
                              "LIVE" ||
                            alreadyVoted ||
                            isVoting
                          }
                          onClick={() =>
                            selectOption(
                              poll,
                              "right"
                            )
                          }
                        >

                          <div className="tv-polls-image">

                            {poll.right_image_url ? (

                              <img
                                src={
                                  poll.right_image_url
                                }
                                alt={
                                  poll.right_name
                                }
                              />

                            ) : (

                              <span>
                                🎭
                              </span>

                            )}

                          </div>


                          <strong>

                            {poll.right_name}

                          </strong>


                          <b>

                            {percentage.right}%

                          </b>


                          <small>

                            {rightVotes.toLocaleString()}{" "}
                            Votes

                          </small>


                          {selected ===
                            "right" &&
                            !alreadyVoted && (

                              <div
                                className="poll-selected-label"
                              >
                                ✓ SELECTED
                              </div>

                            )}

                        </button>

                      </div>


                      {/* =================================
                          VOTE NOW BUTTON
                      ================================= */}

                      {status ===
                        "LIVE" &&
                        !alreadyVoted && (

                          <button
                            type="button"
                            className={`poll-vote-btn ${
                              selected
                                ? "ready"
                                : ""
                            }`}
                            disabled={
                              !selected ||
                              isVoting
                            }
                            onClick={() =>
                              handleVote(
                                poll
                              )
                            }
                          >

                            {isVoting
                              ? "SUBMITTING..."
                              : "VOTE NOW"}

                            {!isVoting && (
                              <span>
                                →
                              </span>
                            )}

                          </button>

                        )}


                      {/* =====================
                          ALREADY VOTED
                      ===================== */}

                      {alreadyVoted && (

                        <div className="poll-voted-btn">

                          ✓ VOTED

                        </div>

                      )}


                      {/* =====================
                          BOTTOM
                      ===================== */}

                      <div className="tv-polls-card-bottom">

                        <span>

                          {totalVotes.toLocaleString()}{" "}
                          total votes

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


        {/* =================================
            EMPTY
        ================================= */}

        {!loading &&
          filteredPolls.length === 0 && (

            <div className="tv-polls-empty">

              <div>
                🗳️
              </div>


              <h3>
                No Polls Found
              </h3>


              <p>
                Live and completed polls
                will appear here.
              </p>

            </div>

          )}

      </main>


      {/* =================================
          BOTTOM NAV
      ================================= */}

      <nav className="tv-polls-bottom-nav">

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


        <div
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


        <div className="active">

          <span>
            ▥
          </span>

          <small>
            Polls
          </small>

        </div>


        <div
          onClick={() =>
            navigate(
              "/profile"
            )
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


export default Polls;