"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Tetris pieces (tetrominoes)
const PIECES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
}

const PIECE_COLORS = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_DROP_TIME = 1000

type PieceType = keyof typeof PIECES
type Board = (number | string)[][]
type Position = { x: number; y: number }

interface GamePiece {
  shape: number[][]
  position: Position
  type: PieceType
}

const createEmptyBoard = (): Board =>
  Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0))

const getRandomPiece = (): PieceType => {
  const pieces = Object.keys(PIECES) as PieceType[]
  return pieces[Math.floor(Math.random() * pieces.length)]
}

const createPiece = (type: PieceType): GamePiece => ({
  shape: PIECES[type],
  position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(PIECES[type][0].length / 2), y: 0 },
  type,
})

const rotatePiece = (piece: number[][]): number[][] => {
  const rotated = piece[0].map((_, index) => piece.map((row) => row[index]).reverse())
  return rotated
}

const isValidMove = (board: Board, piece: GamePiece, newPosition: Position): boolean => {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = newPosition.x + x
        const newY = newPosition.y + y

        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false
        }

        if (newY >= 0 && board[newY][newX] !== 0) {
          return false
        }
      }
    }
  }
  return true
}

const placePiece = (board: Board, piece: GamePiece): Board => {
  const newBoard = board.map((row) => [...row])

  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.position.y + y
        const boardX = piece.position.x + x
        if (boardY >= 0) {
          newBoard[boardY][boardX] = piece.type
        }
      }
    }
  }

  return newBoard
}

const clearLines = (board: Board): { newBoard: Board; linesCleared: number } => {
  const newBoard = board.filter((row) => row.some((cell) => cell === 0))
  const linesCleared = BOARD_HEIGHT - newBoard.length

  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0))
  }

  return { newBoard, linesCleared }
}

export default function TetrisGame() {
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState<GamePiece | null>(null)
  const [nextPiece, setNextPiece] = useState<PieceType>("I")
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME)

  useEffect(() => {
    setNextPiece(getRandomPiece())
  }, [])

  const gameLoopRef = useRef<NodeJS.Timeout>()

  const spawnNewPiece = useCallback(() => {
    const newPiece = createPiece(nextPiece)
    setCurrentPiece(newPiece)
    setNextPiece(getRandomPiece())

    if (!isValidMove(board, newPiece, newPiece.position)) {
      setGameOver(true)
      setIsPlaying(false)
    }
  }, [board, nextPiece])

  const movePiece = useCallback(
    (direction: "left" | "right" | "down") => {
      if (!currentPiece || gameOver) return

      const newPosition = { ...currentPiece.position }

      switch (direction) {
        case "left":
          newPosition.x -= 1
          break
        case "right":
          newPosition.x += 1
          break
        case "down":
          newPosition.y += 1
          break
      }

      if (isValidMove(board, currentPiece, newPosition)) {
        setCurrentPiece({ ...currentPiece, position: newPosition })
      } else if (direction === "down") {
        // Piece has landed
        const newBoard = placePiece(board, currentPiece)
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)

        setBoard(clearedBoard)
        setLines((prev) => prev + linesCleared)
        setScore((prev) => prev + linesCleared * 100 * level + 10)

        // Increase level every 10 lines
        const newLevel = Math.floor((lines + linesCleared) / 10) + 1
        if (newLevel > level) {
          setLevel(newLevel)
          setDropTime(Math.max(100, INITIAL_DROP_TIME - (newLevel - 1) * 100))
        }

        setCurrentPiece(null)
      }
    },
    [currentPiece, board, gameOver, level, lines],
  )

  const rotatePieceHandler = useCallback(() => {
    if (!currentPiece || gameOver) return

    const rotatedShape = rotatePiece(currentPiece.shape)
    const rotatedPiece = { ...currentPiece, shape: rotatedShape }

    if (isValidMove(board, rotatedPiece, currentPiece.position)) {
      setCurrentPiece(rotatedPiece)
    }
  }, [currentPiece, board, gameOver])

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver) return

    let newY = currentPiece.position.y
    while (isValidMove(board, currentPiece, { ...currentPiece.position, y: newY + 1 })) {
      newY += 1
    }

    // Directly place the piece at the bottom position
    const pieceAtBottom = { ...currentPiece, position: { ...currentPiece.position, y: newY } }
    const newBoard = placePiece(board, pieceAtBottom)
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)

    setBoard(clearedBoard)
    setLines((prev) => prev + linesCleared)
    setScore((prev) => prev + linesCleared * 100 * level + 10)

    // Increase level every 10 lines
    const newLevel = Math.floor((lines + linesCleared) / 10) + 1
    if (newLevel > level) {
      setLevel(newLevel)
      setDropTime(Math.max(100, INITIAL_DROP_TIME - (newLevel - 1) * 100))
    }

    setCurrentPiece(null)
  }, [currentPiece, board, gameOver, level, lines])

  // Game loop
  useEffect(() => {
    if (isPlaying && !gameOver) {
      gameLoopRef.current = setInterval(() => {
        if (currentPiece) {
          movePiece("down")
        } else {
          spawnNewPiece()
        }
      }, dropTime)
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [isPlaying, gameOver, currentPiece, movePiece, spawnNewPiece, dropTime])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          movePiece("left")
          break
        case "ArrowRight":
          e.preventDefault()
          movePiece("right")
          break
        case "ArrowDown":
          e.preventDefault()
          movePiece("down")
          break
        case "ArrowUp":
          e.preventDefault()
          rotatePieceHandler()
          break
        case " ":
          e.preventDefault()
          hardDrop()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isPlaying, gameOver, movePiece, rotatePieceHandler, hardDrop])

  const startGame = () => {
    setBoard(createEmptyBoard())
    setCurrentPiece(null)
    setNextPiece(getRandomPiece())
    setScore(0)
    setLines(0)
    setLevel(1)
    setDropTime(INITIAL_DROP_TIME)
    setGameOver(false)
    setIsPlaying(true)
  }

  const pauseGame = () => {
    setIsPlaying(!isPlaying)
  }

  // Render the game board with current piece
  const renderBoard = () => {
    const displayBoard = board.map((row) => [...row])

    // Add current piece to display board
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.position.y + y
            const boardX = currentPiece.position.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.type
            }
          }
        }
      }
    }

    return displayBoard.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => {
          let cellColor = "bg-slate-900 border-slate-700"
          let isCurrentPiece = false

          if (cell !== 0) {
            if (typeof cell === 'string') {
              // Placed piece
              cellColor = `border ${PIECE_COLORS[cell as PieceType].replace('#', 'border-')} bg-opacity-95`
              cellColor += ` ${PIECE_COLORS[cell as PieceType].replace('#', 'bg-')}`
            } else if (currentPiece && cell === currentPiece.type) {
              // Current piece
              isCurrentPiece = true
              cellColor = `border ${PIECE_COLORS[currentPiece.type].replace('#', 'border-')} bg-opacity-85`
              cellColor += ` ${PIECE_COLORS[currentPiece.type].replace('#', 'bg-')}`
            }
          }

          return (
            <div
              key={x}
              className={`w-5 h-5 sm:w-6 sm:h-6 border ${cellColor}`}
              style={{
                backgroundColor: cell !== 0 ? (typeof cell === 'string' ? PIECE_COLORS[cell as PieceType] : PIECE_COLORS[currentPiece?.type || 'I']) : undefined,
                boxShadow: isCurrentPiece ? `inset 0 0 0 1px rgba(255,255,255,0.3)` : cell !== 0 ? `inset 0 1px 0 rgba(255,255,255,0.15)` : 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            />
          )
        })}
      </div>
    ))
  }

  // Render next piece preview
  const renderNextPiece = () => {
    const shape = PIECES[nextPiece]
    return (
      <div className="flex flex-col items-center justify-center min-h-[50px] sm:min-h-[60px]">
        {shape.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => (
              <div
                key={x}
                className={`w-4 h-4 sm:w-5 sm:h-5 border ${cell ? 'shadow-sm' : 'border-transparent'}`}
                style={{
                  backgroundColor: cell ? PIECE_COLORS[nextPiece] : 'transparent',
                  boxShadow: cell ? `inset 0 0 0 1px rgba(255,255,255,0.2)` : 'none'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-2 sm:mb-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 tracking-wider drop-shadow-2xl">
            TETRIS
          </h1>
          <div className="text-slate-400 text-xs sm:text-sm font-medium tracking-widest uppercase mt-1">
            Professional Edition
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="flex flex-col xl:flex-row items-center justify-center gap-3 sm:gap-4">
          {/* Game Board */}
          <div className="flex flex-col items-center order-1 xl:order-1">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-lg p-2 sm:p-3 shadow-2xl">
              <div className="bg-slate-950 border border-slate-600 rounded p-1 sm:p-2">
                <div className="bg-black border border-slate-500 inline-block rounded-sm overflow-hidden shadow-inner">
                  {renderBoard()}
                </div>
              </div>
            </div>
          </div>

          {/* Game Info Panel */}
          <div className="flex flex-col gap-2 sm:gap-3 w-full xl:w-auto xl:min-w-[240px] xl:max-w-[280px] order-2 xl:order-2">
            {/* Game Controls */}
            <div className="space-y-2">
              {!isPlaying && !gameOver && (
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200 uppercase tracking-wide text-xs sm:text-sm"
                >
                  Start Game
                </button>
              )}

              {isPlaying && (
                <button
                  onClick={pauseGame}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200 uppercase tracking-wide text-xs sm:text-sm"
                >
                  {isPlaying ? "Pause" : "Resume"}
                </button>
              )}

              {gameOver && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-red-400 mb-1">Game Over</div>
                    <div className="text-cyan-300 text-xs sm:text-sm">Final Score: {score.toLocaleString()}</div>
                  </div>
                  <button
                    onClick={startGame}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg transform hover:scale-[1.02] transition-all duration-200 uppercase tracking-wide text-xs sm:text-sm"
                  >
                    New Game
                  </button>
                </div>
              )}
            </div>
            {/* Next Piece */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 sm:p-4 shadow-xl">
              <div className="text-center mb-2 sm:mb-3">
                <h3 className="text-base sm:text-lg font-bold text-cyan-400 uppercase tracking-wide">Next</h3>
              </div>
              <div className="bg-slate-950 border border-slate-600 rounded p-2 sm:p-3 flex items-center justify-center">
                {renderNextPiece()}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 sm:p-4 shadow-xl">
              <div className="text-center mb-2 sm:mb-3">
                <h3 className="text-base sm:text-lg font-bold text-green-400 uppercase tracking-wide">Stats</h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-1 gap-1 sm:gap-2">
                <div className="bg-slate-950 border border-slate-600 rounded p-1 sm:p-2 text-center">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Score</div>
                  <div className="text-sm sm:text-xl font-bold text-white tabular-nums">{score.toLocaleString()}</div>
                </div>
                <div className="bg-slate-950 border border-slate-600 rounded p-1 sm:p-2 text-center">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Lines</div>
                  <div className="text-sm sm:text-xl font-bold text-white">{lines}</div>
                </div>
                <div className="bg-slate-950 border border-slate-600 rounded p-1 sm:p-2 text-center">
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Level</div>
                  <div className="text-sm sm:text-xl font-bold text-white">{level}</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 sm:p-4 shadow-xl">
              <div className="text-center mb-2 sm:mb-3">
                <h3 className="text-base sm:text-lg font-bold text-yellow-400 uppercase tracking-wide">Controls</h3>
              </div>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center bg-slate-950 border border-slate-600 rounded px-2 sm:px-3 py-1 sm:py-2">
                  <span className="text-slate-300">Move</span>
                  <span className="text-white font-mono text-xs">← →</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 border border-slate-600 rounded px-2 sm:px-3 py-1 sm:py-2">
                  <span className="text-slate-300">Soft Drop</span>
                  <span className="text-white font-mono text-xs">↓</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 border border-slate-600 rounded px-2 sm:px-3 py-1 sm:py-2">
                  <span className="text-slate-300">Rotate</span>
                  <span className="text-white font-mono text-xs">↑</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 border border-slate-600 rounded px-2 sm:px-3 py-1 sm:py-2">
                  <span className="text-slate-300">Hard Drop</span>
                  <span className="text-white font-mono text-xs">SPACE</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-2 sm:mt-4 text-slate-500 text-xs">
          Use keyboard controls to play • Built with Next.js & Tailwind CSS
        </div>
      </div>
    </div>
  )
}
