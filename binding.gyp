{
	'targets': [
		{
			'target_name': 'mbus',
			'cflags': [
                '-w'
			],
			'include_dirs': [
				'./libmbus/mbus',
				"<!(node -e \"require('nan')\")"
			],
			'sources': [
				'./src/main.cc',
				'./src/mbus-master.cc',
				'./src/util.cc'
			],
            'conditions': [
                ['OS=="mac"', {
                    'xcode_settings': {
                        'OTHER_CFLAGS': [
                            '-w'
                        ],
                    }
                }]
            ],
            'dependencies': [
                'libmbus'
            ],
            'configurations': {
                'Debug': {
                    'defines': [ 'DEBUG', '_DEBUG', 'USE_VIRTUAL_SERIALPORT=1' ],
                },
                'Release': {
                }
            }
		},
		{
			'target_name': 'libmbus',
            'type': 'static_library',
			'cflags': [
                '-w'
			],
			'include_dirs': [
				'./libmbus/mbus',
			],
			'sources': [
				'./libmbus/mbus/mbus-protocol-aux.c',
				'./libmbus/mbus/mbus-protocol.c',
				'./libmbus/mbus/mbus-serial.c',
				'./libmbus/mbus/mbus-tcp.c',
				'./libmbus/mbus/mbus.c'
			],
            'conditions': [
                ['OS=="mac"', {
                    'xcode_settings': {
                        'OTHER_CFLAGS': [
                            '-w'
                        ],
                    }
                }],
                ['OS=="win"', {
			        'sources': [
                        './libmbus/win/termiWin.c'
                    ]
                }]
            ]
		}
	]
}
