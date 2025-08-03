from firebase_functions import https_fn, tasks_fn
from firebase_functions.options import RetryConfig, RateLimits
from firebase_admin import initialize_app

initialize_app()

@https_fn.on_request()
def on_request_example(req: https_fn.Request) -> https_fn.Response:
    # code = req.form.get("code", "def hello(): return 'Hello, World!'")
    code = "def hello(): return 'Hello, World!'"

    print(f'Executing code: {code}')
    exec(code)
    helloFn = locals().get("hello")
    print(helloFn)

    if callable(helloFn):
        ret = helloFn()
        return https_fn.Response(str(ret), status=200, mimetype="text/plain")

    return https_fn.Response("No function found", status=400, mimetype="text/plain")

@tasks_fn.on_task_dispatched(retry_config=RetryConfig(max_attempts=5, min_backoff_seconds=60),
                             rate_limits=RateLimits(max_concurrent_dispatches=10))
def execute_submission(req: tasks_fn.CallableRequest) -> str:
    task_id = req.data.get("taskId")
    submission_id = req.data.get("submissionId")
    subset = req.data.get("subset")
    input = req.data.get("input")
    output = req.data.get("output")

    print(f"Executing submission: {submission_id}, task: {task_id}, subset: {subset}")

    return 'ok'