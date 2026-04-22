"""Parity tests between the OpenAPI destination config serializers and the Temporal workflow input dataclasses.

The DRF serializers in `posthog/batch_exports/http.py` exist only to shape the OpenAPI schema
for integration-backed destinations; the dataclasses in
`products/batch_exports/backend/service.py` are the runtime source of truth. These tests fail
when the two drift so the generated MCP/Zod schemas never silently lie to agents.
"""

import dataclasses
from typing import Any, Union, get_args, get_origin

from rest_framework import serializers

from posthog.batch_exports.http import AzureBlobDestinationConfigSerializer, DatabricksDestinationConfigSerializer

from products.batch_exports.backend.service import (
    AzureBlobBatchExportInputs,
    BaseBatchExportInputs,
    DatabricksBatchExportInputs,
)


def _dataclass_field_types(dc: Any) -> dict[str, Any]:
    base = {f.name for f in dataclasses.fields(BaseBatchExportInputs)}
    return {f.name: f.type for f in dataclasses.fields(dc) if f.name not in base}


def _dataclass_field_defaults(dc: Any) -> dict[str, Any]:
    base = {f.name for f in dataclasses.fields(BaseBatchExportInputs)}
    defaults: dict[str, Any] = {}
    for f in dataclasses.fields(dc):
        if f.name in base:
            continue
        if f.default is not dataclasses.MISSING:
            defaults[f.name] = f.default
    return defaults


def _serializer_required_fields(serializer_class: type[serializers.Serializer]) -> dict[str, serializers.Field]:
    return serializer_class().get_fields()


def _is_optional(type_hint: Any) -> bool:
    if get_origin(type_hint) is Union:
        return type(None) in get_args(type_hint)
    return False


def _assert_parity(serializer_class: type[serializers.Serializer], dataclass: Any) -> None:
    dc_types = _dataclass_field_types(dataclass)
    dc_defaults = _dataclass_field_defaults(dataclass)
    ser_fields = _serializer_required_fields(serializer_class)

    extra_in_serializer = set(ser_fields) - set(dc_types)
    missing_in_serializer = set(dc_types) - set(ser_fields)
    assert not extra_in_serializer, (
        f"{serializer_class.__name__} has fields not in {dataclass.__name__}: {extra_in_serializer}"
    )
    assert not missing_in_serializer, (
        f"{serializer_class.__name__} is missing fields from {dataclass.__name__}: {missing_in_serializer}"
    )

    for name, dc_type in dc_types.items():
        ser_field = ser_fields[name]
        dc_has_default = name in dc_defaults
        ser_is_required = ser_field.required

        if dc_has_default:
            assert not ser_is_required, (
                f"{serializer_class.__name__}.{name} should be optional (dataclass has default {dc_defaults[name]!r})"
            )
            assert ser_field.default == dc_defaults[name], (
                f"{serializer_class.__name__}.{name} default {ser_field.default!r} "
                f"differs from dataclass default {dc_defaults[name]!r}"
            )
        elif _is_optional(dc_type):
            # str | None with no default — treat as optional nullable.
            assert not ser_is_required, (
                f"{serializer_class.__name__}.{name} should be optional (dataclass type is Optional)"
            )
        else:
            assert ser_is_required, (
                f"{serializer_class.__name__}.{name} should be required (dataclass field has no default)"
            )


def test_databricks_destination_config_matches_dataclass() -> None:
    _assert_parity(DatabricksDestinationConfigSerializer, DatabricksBatchExportInputs)


def test_azure_blob_destination_config_matches_dataclass() -> None:
    _assert_parity(AzureBlobDestinationConfigSerializer, AzureBlobBatchExportInputs)
