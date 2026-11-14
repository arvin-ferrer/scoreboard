# Get One Fourth (Get ¼): The Pen and Paper Programming Challenge, Mechanics

**Theme:** Reprise
**Version:** Complete, with all committee decisions as of Nov 14, 2026

Rules marked **(tentative)** are working answers that the committee still has to confirm. Everything else is final.

**Note for the scoreboard software:** these rules are applied by human proctors, face to face. The software does not enforce or track any of them. It only records points added or subtracted. Section 10 lists the point values the scorer screens need.

---

## 1. Participants and registration

- Open to UPLB undergraduates with basic knowledge of C, Python and JavaScript.
- Players form a **chamber** of 2 or 3 members. Only the first **15 chambers** to register can join. Registration closes once the chambers are full.
- Recommended: members who specialize in each language (Python, C, JavaScript).

## 2. Game proper

- Each team is a **chamber**. Each chamber has a **proctor** for checking and calculations.
- Participants sit in an elliptical formation. The question pools are in the middle of the ellipse.
- The game has 3 movements: **Adagio** (Question Pool), **Andante** (Chamber Battles) and **Allegro** (Pen and Paper Coding). If there is a tie for a podium place, tied chambers play a 4th movement, **Vivace** (Speed Rounds).
- The goal is to collect as many **decibels (dB)** as possible by answering programming problems.
- A chamber's total can go **below 0**.

## 3. Prizes

| Place | Prize |
| --- | --- |
| 1st | PHP 2,500 |
| 2nd | PHP 1,500 |
| 3rd | PHP 1,000 |

---

## 4. First Movement: Adagio (Question Pool), 15 minutes

### Questions

- 60 questions sit in the center of the playing area, split into 2 pools.
- By difficulty: **Easy 25**, **Medium 20**, **Hard 15**.
- Each chamber appoints **one runner** to get questions from the pool. A chamber cannot change its runner.
- A chamber can answer **one question at a time**.
- Every chamber starts with an **Easy starter question**.
- If the questions run out, go straight to the 2nd Movement.

### Answers

- Each chamber gets 3 sheets of ¼ paper for its answers in Movements 1 and 2, plus scratch paper.
- After answering, the chamber brings the question to its proctor for scoring.
- A chamber can **discard** a question. A discard counts as a wrong answer.
- A chamber must answer (or discard) its current question before getting a new one.

### Results

**Correct**

- The chamber gains the decibels for that question.
- The chamber writes its name on the question and keeps it as a **Treble** for the next movement, as long as it holds fewer than 2.
- If the chamber already holds 2 Trebles, it may **swap** one of them for this question. Whichever question it does not keep **goes back to the question pool**.
- The runner then picks another question.

**Wrong or discarded**

- The chamber gets **0 dB**. There is no penalty.
- The question goes back to the pool for other chambers.
- The runner then picks another question.

### Scoring

| Difficulty | Decibels |
| --- | --- |
| Easy | +10 |
| Medium | +20 |
| Hard | +30 |

### Trebles at the end of Adagio

- A chamber holds **0, 1 or 2 Trebles**. Holding fewer than 2 is allowed.
- A chamber with 0 Trebles has nothing to attack with and skips its attack in each sequence.
- A chamber refills its Trebles during Andante by answering leftover pool questions correctly, or by receiving Trebles from attacks against it. The limit is always **2 at a time**.

---

## 5. Second Movement: Andante (Chamber Battles), 15 minutes

Before Andante starts, every chamber gets a **3-minute strategy timer** to plan.

The movement has **4 sequences**. Each sequence has two phases: an Attack Phase and a Defense Phase.

### Attack Phase (30 seconds)

- Each chamber can use its stored Trebles to attack another chamber. A chamber can attack **once per Attack Phase**.
- A chamber with at least 1 Treble must attack. A chamber with no Trebles skips.
- The runner gives a Treble to the proctor stationed at the target chamber's station.
- The proctor returns the Treble to the runner if the target chamber has already answered that question.
- A chamber cannot attack itself.
- **Only one attack can be active on a chamber at a time.** The target's proctor raises a sign to show the chamber can't be attacked.
- If a chamber has no valid target left, its attack is **skipped**.

### Defense Phase (3 minutes)

- The defending chamber gets the question and must answer it correctly.
- Each defense lasts a maximum of **3 minutes**. If the question is not answered in 3 minutes, it counts as wrong, and the defender loses decibels automatically.
- The **attacker gains and loses nothing**. Only the defender's score changes.

### Defense scoring

| Treble difficulty | Defense correct | Defense wrong or timed out |
| --- | --- | --- |
| Easy | +10 | −10 |
| Medium | +20 | −20 |
| Hard | +30 | −30 |

- The defender **keeps the Treble** it was attacked with, whether it answered right or wrong. This is how chambers refill their Trebles.
- **(tentative)** If the defender already holds 2 Trebles, it cannot swap. The incoming Treble goes back to the question pool.

### Question pool during Andante

- Chambers can still answer pool questions, **including while defending**.
- A chamber that has no open question gets a new one from the pool.
- Pool questions pay less than in Adagio:

| Difficulty | Decibels |
| --- | --- |
| Easy | +5 |
| Medium | +15 |
| Hard | +20 |

- A wrong pool answer in Andante costs **0 dB**. The question goes back to the pool.
- A correct pool answer becomes a Treble if the chamber holds fewer than 2.
- **(tentative)** If the chamber already holds 2, it cannot swap. It still gets the decibels, and the question goes back to the pool.

---

## 6. Third Movement: Allegro (Pen and Paper Coding), 40 minutes

### Power-up draft (before the movement starts)

- Each chamber chooses **1 power-up**, picking in order of **lowest decibels first** (Adagio plus Andante).
- If chambers are tied on decibels, they settle the pick order with **rock-paper-scissors**.
- A chamber with **0 or fewer decibels cannot pick Fortissimo**. It must pick another power-up.

### Questions

- Each chamber gets a set of **15 questions**: Easy 3, Medium 5, Hard 7.
- Hard questions are pen-and-paper. Easy and Medium questions are fill-in-the-blank.
- Chambers answer as many as they can in 40 minutes, using only pens and paper. Answers must be **legible** to count.

### Scoring

| Difficulty | Questions | Value |
| --- | --- | --- |
| Easy | 3 | 15 dB |
| Medium | 5 | 30 dB |
| Hard | 7 | 60 dB |

- **Correct:** the chamber gets the value of the question, minus **5 dB for each syntax error**. A question's score never goes below 0 because of syntax errors.
- **Incorrect:** the chamber **loses** the value of the question. This includes any answer with a **semantic error**.
- **Unanswered:** **0 dB**, with no penalty. Only incorrect answers subtract.

Definitions for proctors:

- A **syntax error** is a mistake in how the code is written, such as a missing bracket or semicolon. The answer still counts, at −5 dB per error.
- A **semantic error** means the logic is wrong. The whole answer is incorrect.

### Power-ups

- A chamber declares its power-up to the proctor **before** the affected question. The question is marked with the power-up's name.
- Each power-up can be used **once**.
- A discarded question can no longer be answered.

| Power-up | Copies | Effect |
| --- | --- | --- |
| **Pianissimo** | 5 | Discard this question and gain +10 dB. |
| **Ritardando** | 4 | After answering a Hard question correctly, gain +40 dB. A wrong answer gets no extra penalty. |
| **Fortissimo** | 3 | Wager up to 100 dB, never more than the chamber's current total, then answer a Hard question. Correct: base score **plus** the wager. Wrong: −base **and** −wager. |
| **Hemiola** | 2 | Once activated, and until an incorrect answer, each correct Hard answer adds +15 dB and discards one remaining Easy question, chosen by the chamber. |
| **Crescendo** | 1 | Discard all remaining Easy and Medium questions. For every question discarded, each later correct Hard answer gets an extra +5 dB. |

### Magnum Opus

- After **20 minutes**, a Magnum Opus question is presented to all chambers.
- For up to **10 minutes**, chambers may answer only the Magnum Opus, until one chamber answers it correctly.
- The **first chamber to answer correctly** gets **+100 dB**.
- If two correct submissions arrive at roughly the same time, they are settled with **Bato Bato Pick**.

### Special Problem

- **5 minutes before the round ends**, every chamber is handed an envelope without warning. The description on the back is visible:
  - "SPECIAL PROBLEM"
  - "+100 dB if correct, else −50 dB"
  - "Must answer before round ends"
  - "Once you open this envelope, you agree to these terms"
- Once the chamber opens the envelope, it must answer the special problem **correctly before the round ends**. Correct earns **+100 dB**. Otherwise **−50 dB** is deducted.
- The chamber answers by **singing the song to its proctor**.
- Each chamber has a separate special problem.
- Information about the special problems must **not** be shared with other committees' non-head members until dry runs start.

---

## 7. Clincher: Vivace (Speed Rounds), 5 minutes

Vivace is played only when a tie affects **1st, 2nd or 3rd place**. It does not change decibel totals, only the final rank.

- Speed questions are flashed on the screen. The tied chambers race to answer.
- **At most 3 questions** are asked.
- The tied chambers fill the **open podium places** in order. The first to answer question 1 correctly takes the highest open place, the first to answer question 2 takes the next, and so on.
- If only one tied chamber remains for the last open place, it takes that place without a question.

Examples:

- **Two chambers tie for 2nd.** Question 1 decides it. The winner is 2nd and the other is 3rd.
- **Three chambers tie for 1st.** Question 1's winner is 1st, question 2's winner is 2nd, and the chamber left over is 3rd.
- **Four or more chambers tie for 1st.** Question 1's winner is 1st, question 2's winner is 2nd, and question 3's winner is 3rd. The rest do not place.

---

## 8. Awarding Ceremony: Presto

Once all scores are in, the three chambers with the highest decibels (after any Vivace tiebreak) are named the winners of **Get One Fourth: Reprise**.

---

## 9. Edge cases

| Situation | Ruling |
| --- | --- |
| Near-simultaneous correct Magnum Opus submissions | Settled with Bato Bato Pick. |
| Two chambers want the same pool question | The first to take it gets it. |
| Two chambers attack the same target in one phase | The first attack locks the target. The other attacker's proctor picks another target. |
| Defender already answered the attacking Treble | The proctor returns the Treble to the runner. |
| A chamber has no valid attack target | Its attack is skipped. |
| A chamber has 0 Trebles | It skips its attack. |
| Total decibels go below 0 | Allowed. |
| Chamber with 0 or fewer dB wants Fortissimo | Not allowed. It picks another power-up. |
| Draft pick tie | Rock-paper-scissors. |

---

## 10. Point values for the scorer screens

The scoreboard shows these as quick buttons for each round. Anything else is entered with the custom + / − pad.

| Round | Event | Points |
| --- | --- | --- |
| Adagio | Correct answer: Easy / Medium / Hard | +10 / +20 / +30 |
| Andante | Defense won: Easy / Medium / Hard | +10 / +20 / +30 |
| Andante | Defense lost or timed out: Easy / Medium / Hard | −10 / −20 / −30 |
| Andante | Pool question correct: Easy / Medium / Hard | +5 / +15 / +20 |
| Allegro | Correct: Easy / Medium / Hard | +15 / +30 / +60 |
| Allegro | Incorrect: Easy / Medium / Hard | −15 / −30 / −60 |
| Allegro | Each syntax error on a correct answer | −5 |
| Allegro | Pianissimo / Hemiola / Ritardando bonus | +10 / +15 / +40 |
| Allegro | Fortissimo wager, Crescendo bonus | Custom amount |
| Allegro | Magnum Opus, first correct | +100 |
| Allegro | Special problem: correct / not correct | +100 / −50 |
| Vivace | Tiebreak | No points. The admin sets the order of the tied chambers. |