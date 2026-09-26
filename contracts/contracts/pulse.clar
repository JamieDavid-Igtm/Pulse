;; pulse.clar - Pulse
;; On-chain public polls for Stacks testnet.
;; One vote per wallet per poll; results are always read from chain.

;; --- errors ---
(define-constant ERR-POLL-NOT-FOUND (err u100))
(define-constant ERR-INVALID-OPTION (err u101))
(define-constant ERR-ALREADY-VOTED (err u102))
(define-constant ERR-POLL-CLOSED (err u103))
(define-constant ERR-BAD-INPUT (err u104))

;; --- state ---
(define-map polls
  { id: uint }
  {
    question: (string-utf8 200),
    options: (list 4 (string-utf8 60)),
    category: (string-utf8 24),
    creator: principal,
    created-at: uint,
    expires-at: uint,
    total-votes: uint
  })

(define-map tally { id: uint, option: uint } uint)
(define-map ballots { id: uint, voter: principal } uint)

(define-data-var next-poll-id uint u1)

;; --- public ---

(define-public (create-poll
    (question (string-utf8 200))
    (options (list 4 (string-utf8 60)))
    (category (string-utf8 24))
    (duration uint))
  (let ((poll-id (var-get next-poll-id)))
    (asserts! (> (len question) u0) ERR-BAD-INPUT)
    (asserts! (>= (len options) u2) ERR-BAD-INPUT)
    (asserts! (is-eq (len options) (len (filter option-filled options))) ERR-BAD-INPUT)
    (asserts! (> (len category) u0) ERR-BAD-INPUT)
    (asserts! (and (>= duration u1) (<= duration u52560)) ERR-BAD-INPUT)
    (map-set polls { id: poll-id }
      {
        question: question,
        options: options,
        category: category,
        creator: tx-sender,
        created-at: stacks-block-height,
        expires-at: (+ stacks-block-height duration),
        total-votes: u0
      })
    (var-set next-poll-id (+ poll-id u1))
    (ok poll-id)))

(define-public (vote (id uint) (option uint))
  (let ((poll (unwrap! (map-get? polls { id: id }) ERR-POLL-NOT-FOUND)))
    (asserts! (< stacks-block-height (get expires-at poll)) ERR-POLL-CLOSED)
    (asserts! (< option (len (get options poll))) ERR-INVALID-OPTION)
    (asserts! (is-none (map-get? ballots { id: id, voter: tx-sender })) ERR-ALREADY-VOTED)
    (map-set ballots { id: id, voter: tx-sender } option)
    (map-set tally { id: id, option: option }
      (+ (default-to u0 (map-get? tally { id: id, option: option })) u1))
    (map-set polls { id: id } (merge poll { total-votes: (+ (get total-votes poll) u1) }))
    (ok option)))

;; --- read-only ---

(define-read-only (get-poll (id uint))
  (map-get? polls { id: id }))

(define-read-only (get-results (id uint))
  (match (map-get? polls { id: id })
    poll (ok {
      counts: (map count-option (list
        { id: id, option: u0 }
        { id: id, option: u1 }
        { id: id, option: u2 }
        { id: id, option: u3 })),
      total: (get total-votes poll)
    })
    ERR-POLL-NOT-FOUND))

(define-read-only (has-voted (id uint) (voter principal))
  (map-get? ballots { id: id, voter: voter }))

(define-read-only (get-total-polls)
  (- (var-get next-poll-id) u1))

(define-read-only (get-current-height)
  stacks-block-height)

;; --- private ---

(define-private (option-filled (option (string-utf8 60)))
  (> (len option) u0))

(define-private (count-option (key { id: uint, option: uint }))
  (default-to u0 (map-get? tally key)))
