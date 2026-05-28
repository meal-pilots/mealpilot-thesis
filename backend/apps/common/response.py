from rest_framework.response import Response


def ok(data=None, meta=None, status_code=200):
    if status_code in (204, 205):
        return Response(status=status_code)

    payload = {'data': data if data is not None else {}}
    if meta is not None:
        payload['meta'] = meta
    return Response(payload, status=status_code)
