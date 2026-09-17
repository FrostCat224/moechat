const POSTS_TO_SHOW = 50;


import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue,
    push,
    set,
    update,
    get
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyA75yvmawdHgeaHz0seDhGC5exvS-teIpc",
    authDomain: "moechat-224.firebaseapp.com",
    databaseURL: "https://moechat-224-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "moechat-224",
    storageBucket: "moechat-224.firebasestorage.app",
    messagingSenderId: "147503997820",
    appId: "1:147503997820:web:1bb59dc4936825af87baf9",
    measurementId: "G-R6MRNWQGZ2"
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


/* =========================
   ELEMENTS
========================= */

const postsDiv = document.getElementById("posts");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const usernameInput = document.getElementById("username");

const statusBox = document.getElementById("status");
const postStatus = document.getElementById("postStatus");

const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");


/* =========================
   PAGE CONFIGURATION
========================= */

let pageConfig = {
    header: "Home",
    background: "",
    filter: "all",
    order: "newest",
    posts: POSTS_TO_SHOW
};

function convertEmojis(text) {
    if (!text) {
        return "";
    }

    return text.replace(
        /\/:([a-zA-Z0-9_-]+):/g,
        '<emoji type="$1"></emoji>'
    );
}

async function loadPageConfig() {

    const pageName =
        document.body.dataset.page || "home";

    try {

        const response =
            await fetch("https://frostcat224.github.io/moechat/pages.json");

        if (!response.ok) {
            throw new Error("Could not load pages.json");
        }

        const pages =
            await response.json();

        if (pages[pageName]) {

            pageConfig = {
                ...pageConfig,
                ...pages[pageName]
            };

        } else {

            console.warn(
                "Page '" +
                pageName +
                "' was not found in pages.json"
            );

        }

    } catch (error) {

        console.error(
            "Error loading page configuration:",
            error
        );

    }


    /* =========================
       CHANGE PAGE BACKGROUND
    ========================= */

    if (pageConfig.background) {

        document.body.style.backgroundImage =
            `url("${pageConfig.background}")`;

    }


    /* =========================
       CHANGE HEADER
    ========================= */

    const forumHeader =
        document.querySelector(".forum-header");

    if (forumHeader && pageConfig.header) {

        forumHeader.textContent =
            pageConfig.header;

    }
   
/* =========================
   R74MOJI
========================= */


    /* =========================
       LOAD POSTS
    ========================= */

    loadPosts();
}


/* =========================
   BOX TOGGLES
========================= */

function toggleBox(boxId, otherBoxId) {

    const box =
        document.getElementById(boxId);

    const other =
        document.getElementById(otherBoxId);

    box.style.display =
        box.style.display === "block"
            ? "none"
            : "block";

    other.style.display = "none";
}


document.getElementById("toggleAccount").onclick = () => {

    toggleBox(
        "accountBox",
        "createBox"
    );

};


document.getElementById("toggleCreate").onclick = () => {

    toggleBox(
        "createBox",
        "accountBox"
    );

};


document.getElementById("sidebarAccount").onclick = () => {

    toggleBox(
        "accountBox",
        "createBox"
    );

};


document.getElementById("sidebarPost").onclick = () => {

    toggleBox(
        "createBox",
        "accountBox"
    );

};


/* =========================
   DATE
========================= */

function formatDate(timestamp) {

    return new Date(timestamp)
        .toLocaleString();

}


/* =========================
   USERNAME
========================= */

async function usernameExists(username) {

    const snap =
        await get(
            ref(db, "users")
        );

    if (!snap.exists()) {
        return false;
    }

    const users =
        Object.values(
            snap.val()
        );

    return users.some(user =>
        user.username &&
        user.username.toLowerCase() ===
        username.toLowerCase()
    );
}


/* =========================
   REGISTER
========================= */

document.getElementById("register").onclick =
    async () => {

        try {

            const username =
                usernameInput.value.trim();

            if (!username) {

                alert("Enter username");
                return;

            }


            if (await usernameExists(username)) {

                alert("Username already exists");
                return;

            }


            const cred =
                await createUserWithEmailAndPassword(
                    auth,
                    emailInput.value,
                    passwordInput.value
                );


            await set(
                ref(
                    db,
                    "users/" + cred.user.uid
                ),
                {
                    username,
                    email: cred.user.email
                }
            );


        } catch (e) {

            console.error(e);

            alert(e.message);

        }

    };


/* =========================
   LOGIN
========================= */

document.getElementById("login").onclick =
    async () => {

        try {

            await signInWithEmailAndPassword(
                auth,
                emailInput.value,
                passwordInput.value
            );

        } catch (e) {

            alert(e.message);

        }

    };


/* =========================
   LOGOUT
========================= */

document.getElementById("logout").onclick =
    () => {

        signOut(auth);

    };


/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (user) {

            const snap =
                await get(
                    ref(
                        db,
                        "users/" + user.uid
                    )
                );


            const username =
                snap.exists()
                    ? snap.val().username
                    : user.email;


            const text =
                "Logged in as: " + username;


            statusBox.textContent =
                text;

            postStatus.textContent =
                text;


        } else {

            statusBox.textContent =
                "Not logged in";

            postStatus.textContent =
                "Not logged in";

        }

    }
);


/* =========================
   CREATE POST
========================= */

document.getElementById("submit").onclick =
    async () => {

        const user =
            auth.currentUser;

        if (!user) {

            alert(
                "You must be logged in!!!"
            );

            return;

        }


        const title =
            titleInput.value.trim();

        const content =
            contentInput.value.trim();

        const isNews =
            document.getElementById(
                "isNews"
            ).checked;


        if (!title || !content) {

            alert(
                "Fill in everything!!!"
            );

            return;

        }


        const snap =
            await get(
                ref(
                    db,
                    "users/" + user.uid
                )
            );


        if (
            !snap.exists() ||
            !snap.val().username
        ) {

            alert(
                "Username missing. Please re-register."
            );

            return;

        }


        const username =
            snap.val().username;


        const newPost =
            push(
                ref(db, "posts")
            );


        await set(
            newPost,
            {

                title,
                content,

                author: username,

                uid: user.uid,

                score: 0,

                timestamp: Date.now(),

                isNews

            }
        );


        titleInput.value = "";

        contentInput.value = "";

        document.getElementById(
            "isNews"
        ).checked = false;

    };




async function vote(id, type) {

    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in to vote!");
        return;
    }


    const userVoteRef =
        ref(
            db,
            "users/" + user.uid + "/votes/" + id
        );


    const voteSnap =
        await get(userVoteRef);


    if (voteSnap.exists()) {
        return;
    }


    const postRef =
        ref(
            db,
            "posts/" + id
        );


    const snap =
        await get(postRef);


    if (!snap.exists()) {
        return;
    }


    let score =
        snap.val().score || 0;


    if (type === "up") {
        score++;
    }


    if (type === "down") {
        score--;
    }


    await update(
        postRef,
        {
            score
        }
    );


    /*
     * Save the vote to the user's account.
     */

    await set(
        userVoteRef,
        type
    );



    const scoreEl =
        document.getElementById(
            "score-" + id
        );


    if (scoreEl) {

        scoreEl.textContent =
            score;

    }


    /*
     * Update the button appearance.
     */

    const post =
        document.querySelector(
            `.post[data-post-id="${id}"]`
        );

    if (post) {

        const buttons =
            post.querySelectorAll(".vote");

        buttons.forEach(button =>
            button.classList.remove("active")
        );

        if (type === "up") {
            buttons[0].classList.add("active");
        }

        if (type === "down") {
            buttons[1].classList.add("active");
        }

    }

}




window.vote = vote;


/* =========================
   BADGES
========================= */

let ownerUsers = [];
let adminUsers = [];
let verifiedUsers = [];


async function loadBadges() {

    try {

        const owner =
            await fetch(
                "https://frostcat224.github.io/moechat/important/owner.txt"
            );

        ownerUsers =
            (await owner.text())
                .split("\n")
                .map(v => v.trim())
                .filter(Boolean);


        const admin =
            await fetch(
                "https://frostcat224.github.io/moechat/important/admins.txt"
            );

        adminUsers =
            (await admin.text())
                .split("\n")
                .map(v => v.trim())
                .filter(Boolean);


        const verified =
            await fetch(
                "https://frostcat224.github.io/moechat/important/verified.txt"
            );

        verifiedUsers =
            (await verified.text())
                .split("\n")
                .map(v => v.trim())
                .filter(Boolean);


    } catch (e) {

        console.error(
            "Badge loading failed",
            e
        );

    }

}


function getBadges(user) {

    let html = "";


    if (ownerUsers.includes(user)) {

        html += `
            <img
                src="https://frostcat224.github.io/moechat/banners/owner.png"
                alt="Owner"
            >
        `;

    }


    if (adminUsers.includes(user)) {

        html += `
            <img
                src="https://frostcat224.github.io/moechat/banners/admin.png"
                alt="Admin"
            >
        `;

    }


    if (verifiedUsers.includes(user)) {

        html += `
            <img
                src="https://frostcat224.github.io/moechat/banners/verified.png"
                alt="Verified"
            >
        `;

    }


    return html;

}


loadBadges();


/* =========================
   SIDEBAR LINKS
========================= */

async function loadSidebarLinks() {

    const sidebar =
        document.getElementById(
            "sidebarLinks"
        );


    try {

        const response =
            await fetch(
                "https://frostcat224.github.io/moechat/links.json"
            );


        if (!response.ok) {

            throw new Error(
                "Could not load links.json"
            );

        }


        const links =
            await response.json();


        sidebar.innerHTML = "";


        links.forEach(link => {

            const a =
                document.createElement("a");


            a.href =
                link.url;


            a.textContent =
                link.name;


            sidebar.appendChild(a);

        });


    } catch (error) {

        console.error(
            "Error loading sidebar links:",
            error
        );


        sidebar.innerHTML =
            "Failed to load links";

    }

}


loadSidebarLinks();


/* =========================
   POST SORTING
========================= */

function sortPosts(posts) {

    switch (pageConfig.order) {

        case "oldest":

            posts.sort(
                ([, a], [, b]) =>
                    (a.timestamp || 0) -
                    (b.timestamp || 0)
            );

            break;


        case "score":

            posts.sort(
                ([, a], [, b]) =>
                    (b.score || 0) -
                    (a.score || 0)
            );

            break;


        case "least-score":

            posts.sort(
                ([, a], [, b]) =>
                    (a.score || 0) -
                    (b.score || 0)
            );

            break;


        case "comments":

            posts.sort(
                ([, a], [, b]) =>
                    (b.commentCount || 0) -
                    (a.commentCount || 0)
            );

            break;


        case "newest":

        default:

            posts.sort(
                ([, a], [, b]) =>
                    (b.timestamp || 0) -
                    (a.timestamp || 0)
            );

            break;

    }

}

/* =========================
   POST FILTERING
========================= */

function filterPosts(posts) {

    switch (pageConfig.filter) {

        case "news":

            return posts.filter(
                ([, post]) =>
                    post.isNews === true
            );


        case "non-news":

            return posts.filter(
                ([, post]) =>
                    post.isNews !== true
            );


        case "all":

        default:

            return posts;

    }

}


/* =========================
   LOAD POSTS
========================= */

async function loadPosts() {

    onValue(
        ref(db, "posts"),
        async (snapshot) => {

            const data =
                snapshot.val();


            if (!data) {

                postsDiv.innerHTML =
                    "No posts";

                return;

            }
           


            /*
             * Convert Firebase object
             * into an array.
             */

            let posts =
                Object.entries(data);

           let userVotes = {};

const user = auth.currentUser;

if (user) {

    const votesSnap =
        await get(
            ref(
                db,
                "users/" + user.uid + "/votes"
            )
        );

    if (votesSnap.exists()) {
        userVotes = votesSnap.val();
    }

}


            /*
             * Filter posts according
             * to the current page.
             */

            posts =
                filterPosts(posts);


            /*
             * Get comment counts.
             */

            for (
                const [id, post]
                of posts
            ) {

                const comments =
                    await get(
                        ref(
                            db,
                            "comments/" + id
                        )
                    );


                post.commentCount =
                    comments.exists()
                        ? Object.keys(
                            comments.val()
                        ).length
                        : 0;

            }


            sortPosts(posts);


            posts =
                posts.slice(
                    0,
                    pageConfig.posts ||
                    POSTS_TO_SHOW
                );


            let html = "";


            for (
                const [id, post]
                of posts
            ) {

                const voted =
                      userVotes[id] || null;

                html += `

                    <div class="post" data-post-id="${id}">

                        <div
                            class="post-title"
                            onclick="
                                location.href =
                                'https://frostcat224.github.io/moechat/post?id=${id}'
                            "
                        >

                            ${post.title}

                        </div>


                        <div class="post-meta">

                            <span
                                class="vote ${
                                    voted === "up"
                                        ? "active"
                                        : ""
                                }"
                                onclick="
                                    vote('${id}', 'up')
                                "
                            >
                                ▲
                            </span>


                            <span
                                class="score"
                                id="score-${id}"
                            >
                                ${post.score || 0}
                            </span>


                            <span
                                class="vote ${
                                    voted === "down"
                                        ? "active"
                                        : ""
                                }"
                                onclick="
                                    vote('${id}', 'down')
                                "
                            >
                                ▼
                            </span>


                            • posted by


                            <a href="/moechat/account?id=${post.uid}">
    ${post.author}
</a>


                            ${getBadges(
                                post.author
                            )}


                            •


                            ${
                                post.isNews
                                    ? `
                                        <img
                                            src="https://frostcat224.github.io/moechat/banners/news.png"
                                            alt="News"
                                        >
                                    `
                                    : ""
                            }


                            ${formatDate(
                                post.timestamp
                            )}


                            •


                            <span
                                onclick="
                                    location.href =
                                    'https://frostcat224.github.io/moechat/post?id=${id}'
                                "
                                style="
                                    cursor:pointer;
                                    color:#0055aa;
                                "
                            >

                                ${
                                    post.commentCount
                                }

                                comment${
                                    post.commentCount === 1
                                        ? ""
                                        : "s"
                                }

                            </span>

                        </div>


                        <div class="post-content">

                         ${convertEmojis(post.content)}

                     </div>

                    </div>

                `;

            }


postsDiv.innerHTML = html;

postsDiv.querySelectorAll("emoji").forEach(emoji => {
    const type = emoji.getAttribute("type");

    if (!type) return;

    const canvas = document.createElement("canvas");

    canvas.width = 480;
    canvas.height = 480;

    canvas.style.width = "1.75em";
    canvas.style.height = "1.75em";
    canvas.style.display = "inline-block";
    canvas.style.verticalAlign = "middle";

    const img = new Image();

    img.onload = () => {
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            img,
            0,
            0,
            canvas.width,
            canvas.height
        );
    };

    img.onerror = () => {
        console.error("R74moji failed to load:", type);
    };

    img.src =
        "https://r74n.com/moji/png/" +
        encodeURIComponent(type) +
        ".png";

    emoji.replaceWith(canvas);
});
           

        }
    );

}


/* =========================
   START PAGE
========================= */

loadPageConfig();
