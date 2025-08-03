from firebase_functions import https_fn, tasks_fn
from firebase_functions.options import RetryConfig, RateLimits
from firebase_admin import initialize_app, firestore

initialize_app()

@https_fn.on_request()
def on_request_example(req: https_fn.Request) -> https_fn.Response:
    # code = req.form.get("code", "def hello(): return 'Hello, World!'")
    code = "def p(g): return 'Hello, World!'"

    print(f'Executing code: {code}')
    exec(code)
    targetFn = locals().get("p")
    print(targetFn)

    if callable(targetFn):
        ret = targetFn()
        return https_fn.Response(str(ret), status=200, mimetype="text/plain")

    return https_fn.Response("No function found", status=400, mimetype="text/plain")

def string_to_matrix(test_case_string):
    """Convert string format like '123\n456\n789' to [[1,2,3],[4,5,6],[7,8,9]]"""
    lines = test_case_string.strip().split('\n')
    matrix = []
    for line in lines:
        row = [int(char) for char in line.strip()]
        matrix.append(row)
    return matrix

# Convert output matrix back to string for comparison
def matrix_to_string(matrix):
    return '\n'.join(''.join(str(cell) for cell in row) for row in matrix)

def is_valid_rectangle_matrix(matrix):
    """Check if matrix is a valid rectangle with 0-9 integers"""
    try:
        # Check if matrix is a list
        if not isinstance(matrix, list):
            return False, "Output must be a list (matrix)"
        
        # Check if matrix is not empty
        if not matrix:
            return False, "Output matrix cannot be empty"
        
        # Check if all rows are lists
        for i, row in enumerate(matrix):
            if not isinstance(row, list):
                return False, f"Row {i} must be a list"
        
        # Check if matrix forms a rectangle (all rows same length)
        if not matrix:
            return False, "Matrix cannot be empty"
        
        width = len(matrix[0])
        for i, row in enumerate(matrix):
            if len(row) != width:
                return False, f"Row {i}: inconsistent width, expected {width}, got {len(row)}"
        
        # Check if all elements are integers in range 0-9
        for i, row in enumerate(matrix):
            for j, cell in enumerate(row):
                if not isinstance(cell, int):
                    return False, f"Element at ({i},{j}) must be an integer, got {type(cell).__name__}"
                if not (0 <= cell <= 9):
                    return False, f"Element at ({i},{j}) must be 0-9, got {cell}"
        
        return True, None
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"

def validate_matrix_shape(matrix, expected_matrix):
    """Validate that matrix has the exact expected shape"""
    try:
        expected_height = len(expected_matrix)
        expected_width = len(expected_matrix[0]) if expected_matrix else 0
        
        if len(matrix) != expected_height:
            return False, f"Expected {expected_height} rows, got {len(matrix)}"
        
        for i, row in enumerate(matrix):
            if len(row) != expected_width:
                return False, f"Row {i}: expected {expected_width} columns, got {len(row)}"
        
        return True, None
        
    except Exception as e:
        return False, f"Shape validation error: {str(e)}"

@tasks_fn.on_task_dispatched(retry_config=RetryConfig(max_attempts=5, min_backoff_seconds=60),
                             rate_limits=RateLimits(max_concurrent_dispatches=10))
def executeSubmission(req: tasks_fn.CallableRequest) -> str:
    task_id = req.data.get("taskId")
    submission_id = req.data.get("submissionId")

    print(f"Executing submission: {submission_id}, task: {task_id}")

    try:
        db = firestore.client()
        
        # Fetch submission data
        submission_ref = db.collection('submissions').document(submission_id)
        submission_doc = submission_ref.get()
        
        if not submission_doc.exists:
            print(f"Submission {submission_id} not found")
            return 'error: submission not found'
        
        submission_data = submission_doc.to_dict()
        user_code = submission_data.get('code', '')
        
        # Fetch task data and test cases
        task_ref = db.collection('taskData').document(task_id)
        task_doc = task_ref.get()
        
        if not task_doc.exists:
            print(f"Task {task_id} not found")
            return 'error: task not found'
        
        task_data = task_doc.to_dict()
        
        # Extract all test cases from all subsets
        test_cases = []
        for subset_name, subset_data in task_data.items():
            if isinstance(subset_data, list):
                for index, case in enumerate(subset_data):
                    if 'input' in case and 'output' in case:
                        test_cases.append({
                            'testCaseId': f"{subset_name}-{index}",
                            'input': case['input'],
                            'expected': case['output']
                        })
        
        print(f"Executing user code: {user_code}")
        print(f"Number of test cases: {len(test_cases)}")
        
        # Execute user code
        exec(user_code)
        user_function = locals().get("p")
        
        if not callable(user_function):
            print("No function 'p' found in user code")
            submission_ref.update({
                'results': [],
                'status': 'rejected'
            })
            return 'error: no function p found'
        
        # Run test cases
        results = []
        for i, test_case in enumerate(test_cases):
            try:
                # Convert string format to matrix
                input_matrix = string_to_matrix(test_case['input'])
                expected_matrix = string_to_matrix(test_case['expected'])
                
                print(f"Test case {i}: input matrix {input_matrix}")
                
                # Execute user function
                output_matrix = user_function(input_matrix)
                
                print(f"Test case {i}: output matrix {output_matrix}")
                
                # First check if it's a valid rectangle matrix with 0-9 values
                is_rectangle_valid, rectangle_error = is_valid_rectangle_matrix(output_matrix)
                
                if not is_rectangle_valid:
                    # Output is not even a valid rectangle matrix
                    results.append({
                        'testCaseId': test_case['testCaseId'],
                        'input': test_case['input'],
                        'expected': test_case['expected'],
                        'actual': '',
                        'status': 'rejected',
                        'errorMessage': rectangle_error
                    })
                    continue
                
                # Output is a valid rectangle matrix, convert to string
                actual_string = matrix_to_string(output_matrix)
                
                # Check if it has the correct shape
                is_shape_valid, shape_error = validate_matrix_shape(output_matrix, expected_matrix)
                
                if not is_shape_valid:
                    # Valid rectangle but wrong shape
                    results.append({
                        'testCaseId': test_case['testCaseId'],
                        'input': test_case['input'],
                        'expected': test_case['expected'],
                        'actual': actual_string,
                        'status': 'rejected',
                        'errorMessage': shape_error
                    })
                    continue
                
                # Check if output matches expected
                expected_string = test_case['expected']
                status = 'accepted' if actual_string == expected_string else 'rejected'
                
                results.append({
                    'testCaseId': test_case['testCaseId'],
                    'input': test_case['input'],
                    'expected': expected_string,
                    'actual': actual_string,
                    'status': status,
                    'errorMessage': None
                })
                
            except Exception as e:
                print(f"Error in test case {i}: {str(e)}")
                results.append({
                    'testCaseId': test_case['testCaseId'],
                    'input': test_case['input'],
                    'expected': test_case['expected'],
                    'actual': '',
                    'status': 'rejected',
                    'errorMessage': str(e)
                })
        
        # Determine overall submission status
        all_accepted = all(result['status'] == 'accepted' for result in results)
        submission_status = 'accepted' if all_accepted and results else 'rejected'
        
        # Save results to submission
        submission_ref.update({
            'results': results,
            'status': submission_status,
            'executedAt': firestore.SERVER_TIMESTAMP
        })
        
        print(f"Execution completed with {len(results)} results, status: {submission_status}")
        return 'ok'
        
    except Exception as e:
        print(f"Error executing submission: {str(e)}")
        try:
            db = firestore.client()
            submission_ref = db.collection('submissions').document(submission_id)
            submission_ref.update({
                'results': [],
                'status': 'rejected',
                'executedAt': firestore.SERVER_TIMESTAMP
            })
        except:
            pass
        return f'error: {str(e)}'