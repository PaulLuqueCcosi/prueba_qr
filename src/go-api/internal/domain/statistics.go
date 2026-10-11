package domain

// Statistics mirrors the node-api statistics object (same field names as the contract).
type Statistics struct {
	Max         float64
	Min         float64
	Average     float64
	Sum         float64
	IsDiagonal  DiagonalFlags
	AnyDiagonal bool
}

type DiagonalFlags struct {
	Original bool
	Q        bool
	R        bool
}
