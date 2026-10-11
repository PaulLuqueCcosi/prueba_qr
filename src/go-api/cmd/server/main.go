package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"

	httpadapter "go-api/internal/adapters/inbound/http"
	"go-api/internal/adapters/outbound/auth"
	"go-api/internal/adapters/outbound/gonumqr"
	"go-api/internal/adapters/outbound/logging"
	"go-api/internal/adapters/outbound/nodeapi"
	"go-api/internal/application"
	"go-api/internal/config"
)

func main() {
	logger := logging.New(os.Stdout)

	cfg, err := config.Load(os.Getenv)
	if err != nil {
		logger.Error("invalid configuration", application.Fields{"error": err.Error()})
		os.Exit(1)
	}

	statistics, err := nodeapi.NewStatisticsClient(cfg.NodeAPIURL, cfg.NodeAPITimeout)
	if err != nil {
		logger.Error("invalid configuration", application.Fields{"error": err.Error()})
		os.Exit(1)
	}

	// One context for the process: it also stops the JWKS background refresh.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	verifier, err := auth.NewJWTVerifier(ctx, auth.Config{
		Issuer:             cfg.Auth.Issuer,
		Audience:           cfg.Auth.Audience,
		JWKSURL:            cfg.Auth.JWKSURL,
		Leeway:             5 * time.Second,
		FetchTimeout:       5 * time.Second,
		UnknownKeyCooldown: 30 * time.Second,
		RefreshInterval:    10 * time.Minute,
	})
	if err != nil {
		logger.Error("invalid configuration", application.Fields{"error": err.Error()})
		os.Exit(1)
	}

	app := httpadapter.NewApp(httpadapter.Dependencies{
		FactorizeMatrix: application.NewFactorizeMatrix(gonumqr.New(), statistics),
		Logger:          logger,
		TokenVerifier:   verifier,
		CORSOrigins:     cfg.CORSOrigins,
	})

	logger.Info("server starting", application.Fields{"port": cfg.Port, "nodeApiUrl": cfg.NodeAPIURL, "authIssuer": cfg.Auth.Issuer})
	err = app.Listen(fmt.Sprintf(":%d", cfg.Port), fiber.ListenConfig{
		DisableStartupMessage: true,
		GracefulContext:       ctx,
	})
	if err != nil {
		logger.Error("server stopped with error", application.Fields{"error": err.Error()})
		os.Exit(1)
	}
	logger.Info("server stopped", nil)
}
