package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v3"

	httpadapter "go-api/internal/adapters/inbound/http"
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

	app := httpadapter.NewApp(httpadapter.Dependencies{
		FactorizeMatrix: application.NewFactorizeMatrix(gonumqr.New(), statistics),
		Logger:          logger,
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger.Info("server starting", application.Fields{"port": cfg.Port, "nodeApiUrl": cfg.NodeAPIURL})
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
