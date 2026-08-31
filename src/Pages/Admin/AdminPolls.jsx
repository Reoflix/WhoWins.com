import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./adminPolls.css";

function AdminPolls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Anime");

  const [leftName, setLeftName] = useState("");
  const [rightName, setRightName] = useState("");

  const [leftImage, setLeftImage] = useState("");
  const [rightImage, setRightImage] = useState("");

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");


  useEffect(() => {
    fetchPolls();
  }, []);


  async function fetchPolls() {
    setLoading(true);

    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      alert("Polls load nahi ho paaye.");
    } else {
      setPolls(data || []);
    }

    setLoading(false);
  }


  async function createPoll(e) {
    e.preventDefault();

    if (!title.trim()) {
      alert("Poll title enter karo.");
      return;
    }

    if (!leftName.trim() || !rightName.trim()) {
      alert("Dono options ke names enter karo.");
      return;
    }

    if (!startsAt || !endsAt) {
      alert("Start aur End time select karo.");
      return;
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (endDate <= startDate) {
      alert("End time start time ke baad hona chahiye.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("polls")
      .insert({
        title: title.trim(),
        category,

        left_name: leftName.trim(),
        right_name: rightName.trim(),

        left_image_url:
          leftImage.trim() || null,

        right_image_url:
          rightImage.trim() || null,

        left_votes: 0,
        right_votes: 0,

        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),

        is_active: true,
      });

    if (error) {
      console.error(error);
      alert(
        "Poll create nahi hua: " +
        error.message
      );
    } else {
      alert("Poll created successfully! 🎉");

      setTitle("");
      setCategory("Anime");

      setLeftName("");
      setRightName("");

      setLeftImage("");
      setRightImage("");

      setStartsAt("");
      setEndsAt("");

      fetchPolls();
    }

    setSaving(false);
  }


  async function deletePoll(id) {
    const confirmDelete = window.confirm(
      "Kya tum ye poll delete karna chahte ho?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Poll delete nahi hua.");
      return;
    }

    fetchPolls();
  }


  function getPollStatus(poll) {
    const now = new Date();
    const start = new Date(poll.starts_at);
    const end = new Date(poll.ends_at);

    if (!poll.is_active) {
      return "DISABLED";
    }

    if (now < start) {
      return "UPCOMING";
    }

    if (now > end) {
      return "ENDED";
    }

    return "LIVE";
  }


  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }


  return (
    <div className="admin-polls-page">

      <header className="admin-polls-header">

        <div>
          <small>
            TOONVERSE ADMIN
          </small>

          <h1>
            Poll Management
          </h1>
        </div>

        <button
          onClick={() =>
            window.location.href = "/admin"
          }
        >
          ← Admin
        </button>

      </header>


      <main className="admin-polls-content">

        {/* CREATE POLL */}

        <section className="create-poll-card">

          <div className="admin-polls-title">

            <div>
              <small>
                CREATE NEW
              </small>

              <h2>
                Create Poll
              </h2>
            </div>

            <span>
              🗳️
            </span>

          </div>


          <form onSubmit={createPoll}>

            {/* TITLE */}

            <label>
              Poll Title
            </label>

            <input
              type="text"
              placeholder="Who is the strongest anime character?"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
            />


            {/* CATEGORY */}

            <label>
              Category
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >
              <option value="Anime">
                Anime
              </option>

              <option value="Cartoon">
                Cartoon
              </option>

              <option value="Gaming">
                Gaming
              </option>

              <option value="Movies">
                Movies
              </option>
            </select>


            {/* OPTIONS */}

            <div className="poll-options-grid">

              {/* LEFT */}

              <div className="poll-option-box">

                <h3>
                  Option 1
                </h3>

                <label>
                  Name
                </label>

                <input
                  type="text"
                  placeholder="Doraemon"
                  value={leftName}
                  onChange={(e) =>
                    setLeftName(e.target.value)
                  }
                />

                <label>
                  Image URL
                </label>

                <input
                  type="text"
                  placeholder="https://..."
                  value={leftImage}
                  onChange={(e) =>
                    setLeftImage(e.target.value)
                  }
                />

                {leftImage && (
                  <img
                    className="poll-preview"
                    src={leftImage}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display =
                        "none";
                    }}
                  />
                )}

              </div>


              {/* RIGHT */}

              <div className="poll-option-box">

                <h3>
                  Option 2
                </h3>

                <label>
                  Name
                </label>

                <input
                  type="text"
                  placeholder="Shinchan"
                  value={rightName}
                  onChange={(e) =>
                    setRightName(e.target.value)
                  }
                />

                <label>
                  Image URL
                </label>

                <input
                  type="text"
                  placeholder="https://..."
                  value={rightImage}
                  onChange={(e) =>
                    setRightImage(e.target.value)
                  }
                />

                {rightImage && (
                  <img
                    className="poll-preview"
                    src={rightImage}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display =
                        "none";
                    }}
                  />
                )}

              </div>

            </div>


            {/* TIME */}

            <div className="poll-time-grid">

              <div>

                <label>
                  Start Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) =>
                    setStartsAt(e.target.value)
                  }
                />

              </div>


              <div>

                <label>
                  End Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) =>
                    setEndsAt(e.target.value)
                  }
                />

              </div>

            </div>


            <button
              className="create-poll-btn"
              disabled={saving}
            >
              {saving
                ? "CREATING..."
                : "CREATE POLL →"}
            </button>

          </form>

        </section>


        {/* EXISTING POLLS */}

        <section className="existing-polls">

          <div className="admin-polls-title">

            <div>
              <small>
                DATABASE
              </small>

              <h2>
                Existing Polls
              </h2>
            </div>

            <button
              onClick={fetchPolls}
              className="refresh-btn"
            >
              ↻
            </button>

          </div>


          {loading ? (

            <div className="polls-loading">
              Loading polls...
            </div>

          ) : polls.length === 0 ? (

            <div className="polls-empty">
              <span>
                🗳️
              </span>

              <h3>
                No Polls Yet
              </h3>

              <p>
                Create your first poll above.
              </p>
            </div>

          ) : (

            <div className="admin-polls-list">

              {polls.map((poll) => {

                const status =
                  getPollStatus(poll);

                const totalVotes =
                  (poll.left_votes || 0) +
                  (poll.right_votes || 0);

                return (

                  <div
                    className="admin-poll-item"
                    key={poll.id}
                  >

                    <div className="admin-poll-main">

                      <div className="admin-poll-info">

                        <div className="poll-status-row">

                          <span
                            className={`poll-status ${status.toLowerCase()}`}
                          >
                            {status}
                          </span>

                          <span className="poll-category">
                            {poll.category}
                          </span>

                        </div>


                        <h3>
                          {poll.title}
                        </h3>


                        <div className="poll-choices">

                          <span>
                            {poll.left_name}
                          </span>

                          <b>
                            VS
                          </b>

                          <span>
                            {poll.right_name}
                          </span>

                        </div>


                        <small>
                          {totalVotes.toLocaleString()} total votes
                        </small>


                        <p>
                          {formatDate(
                            poll.starts_at
                          )}

                          {" → "}

                          {formatDate(
                            poll.ends_at
                          )}
                        </p>

                      </div>


                      <button
                        className="delete-poll-btn"
                        onClick={() =>
                          deletePoll(
                            poll.id
                          )
                        }
                      >
                        🗑️
                      </button>

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default AdminPolls;