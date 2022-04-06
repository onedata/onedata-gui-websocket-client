.PHONY: test test_ci clean

all: test

clean:
	npm run clean

deps:
	npm run deps

test:
	npm run deps && npm run test

test_ci:
	npm run test-ci

submodules:
	git submodule sync --recursive ${submodule}
	git submodule update --init --recursive ${submodule}
