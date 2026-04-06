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
type Board = number[][]
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

        if (newY >= 0 && board[newY][newX]) {
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
          newBoard[boardY][boardX] = 1
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
  const [nextPiece, setNextPiece] = useState<PieceType>(getRandomPiece())
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME)

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
              displayBoard[boardY][boardX] = 2 // Current piece
            }
          }
        }
      }
    }

    return displayBoard.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={x}
            className={`w-6 h-6 border border-gray-300 ${
              cell === 1 ? "bg-gray-600" : cell === 2 ? `bg-blue-500` : "bg-gray-100"
            }`}
          />
        ))}
      </div>
    ))
  }

  // Render next piece preview
  const renderNextPiece = () => {
    const shape = PIECES[nextPiece]
    return shape.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div key={x} className={`w-4 h-4 border border-gray-200 ${cell ? "bg-blue-400" : "bg-gray-50"}`} />
        ))}
      </div>
    ))
  }

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-6 text-center">Tetris</h1>

      <div className="flex gap-6">
        {/* Game Board */}
        <Card className="p-4 bg-gray-800 border-gray-600">
          <div className="border-2 border-gray-600 bg-gray-100">{renderBoard()}</div>
        </Card>

        {/* Game Info */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 bg-gray-800 border-gray-600">
            <h3 className="text-lg font-semibold mb-2">Next Piece</h3>
            <div className="bg-gray-100 p-2 rounded">{renderNextPiece()}</div>
          </Card>

          <Card className="p-4 bg-gray-800 border-gray-600">
            <div className="space-y-2">
              <div>Score: {score}</div>
              <div>Lines: {lines}</div>
              <div>Level: {level}</div>
            </div>
          </Card>

          <div className="space-y-2">
            {!isPlaying && !gameOver && (
              <Button onClick={startGame} className="w-full">
                Start Game
              </Button>
            )}

            {isPlaying && (
              <Button onClick={pauseGame} className="w-full">
                {isPlaying ? "Pause" : "Resume"}
              </Button>
            )}

            {gameOver && (
              <div className="text-center">
                <div className="text-red-400 font-bold mb-2">Game Over!</div>
                <Button onClick={startGame} className="w-full">
                  New Game
                </Button>
              </div>
            )}
          </div>

          <Card className="p-4 bg-gray-800 border-gray-600">
            <h3 className="text-sm font-semibold mb-2">Controls</h3>
            <div className="text-xs space-y-1">
              <div>← → Move</div>
              <div>↓ Soft Drop</div>
              <div>↑ Rotate</div>
              <div>Space Hard Drop</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
