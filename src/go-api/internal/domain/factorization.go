package domain

// Factorization is a full QR decomposition: Q is m×m and R is m×n for an m×n input.
type Factorization struct {
	Q Matrix
	R Matrix
}

// Matrices groups the three matrices statistics are computed over.
type Matrices struct {
	Original Matrix
	Q        Matrix
	R        Matrix
}
